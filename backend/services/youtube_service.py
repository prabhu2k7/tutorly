import json
import re
from typing import Dict, List, Optional
from urllib import parse, request

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    InvalidVideoId,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApiException,
)


VIDEO_ID_RE = re.compile(
    r"(?:v=|youtu\.be/|/embed/|/shorts/|/v/)([A-Za-z0-9_-]{11})"
)


class YouTubeImportError(Exception):
    """Raised when a YouTube URL cannot be ingested."""


def extract_video_id(url: str) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url):
        return url
    match = VIDEO_ID_RE.search(url)
    return match.group(1) if match else None


def fetch_video_title(video_id: str) -> str:
    """Public oEmbed endpoint — no API key needed."""
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    q = parse.urlencode({"url": watch_url, "format": "json"})
    try:
        with request.urlopen(
            f"https://www.youtube.com/oembed?{q}", timeout=10
        ) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data.get("title") or f"YouTube video {video_id}"
    except Exception:
        return f"YouTube video {video_id}"


def fetch_transcript_segments(video_id: str) -> List[Dict]:
    """Return transcript as a list of {text, start, duration} segments.

    Two-stage strategy:
      1. youtube-transcript-api (fast, lightweight) — works in most environments.
      2. yt-dlp fallback (heavier, different endpoints) — sometimes succeeds
         where (1) was IP-blocked by YouTube on cloud-host IPs.
    """
    primary_error: Optional[Exception] = None
    try:
        return _fetch_via_transcript_api(video_id)
    except YouTubeImportError as e:
        # Hard fails we don't retry on (no captions, deleted video, bad id).
        msg = str(e).lower()
        unrecoverable = (
            "disabled" in msg
            or "unavailable" in msg
            or "invalid" in msg
            or "empty" in msg
        )
        if unrecoverable:
            raise
        primary_error = e
    except Exception as e:
        primary_error = e

    # Fallback: yt-dlp through YouTube's internal "innertube" API.
    try:
        return _fetch_via_ytdlp(video_id)
    except YouTubeImportError:
        raise
    except Exception as e:
        # Surface the more informative primary error if we have one.
        detail = primary_error or e
        raise YouTubeImportError(
            f"Could not fetch transcript via primary or fallback path. "
            f"This deployment's IP may be blocked by YouTube. ({detail})"
        )


def _fetch_via_transcript_api(video_id: str) -> List[Dict]:
    api = YouTubeTranscriptApi()
    try:
        try:
            fetched = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        except NoTranscriptFound:
            transcript_list = api.list(video_id)
            first = next(iter(transcript_list))
            fetched = first.fetch()
    except TranscriptsDisabled:
        raise YouTubeImportError("Captions are disabled for this video — try a different one.")
    except VideoUnavailable:
        raise YouTubeImportError("This video is unavailable (private, region-blocked, or removed).")
    except InvalidVideoId:
        raise YouTubeImportError("That doesn't look like a valid YouTube video id.")
    except YouTubeTranscriptApiException as e:
        # Could be IpBlocked, RequestBlocked, RateLimitExceeded — bubble up so the
        # outer dispatcher can attempt the yt-dlp fallback.
        raise YouTubeImportError(f"transcript-api: {e}")
    except Exception as e:
        raise YouTubeImportError(f"transcript-api network error: {e}")

    segments: List[Dict] = []
    for s in fetched:
        text = getattr(s, "text", None)
        start = getattr(s, "start", None)
        duration = getattr(s, "duration", None)
        if text:
            segments.append({
                "text": text,
                "start": float(start) if start is not None else 0.0,
                "duration": float(duration) if duration is not None else 0.0,
            })
    if not segments:
        raise YouTubeImportError("Transcript was empty.")
    return segments


def _fetch_via_ytdlp(video_id: str) -> List[Dict]:
    """Use yt-dlp to grab the json3 caption URL and fetch it directly.

    yt-dlp talks to YouTube's internal player API (innertube), which is a
    different endpoint than what youtube-transcript-api scrapes. On some
    cloud IPs this succeeds where the primary path fails.
    """
    import yt_dlp  # noqa: WPS433 — local import to avoid loading the heavy lib at startup

    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en", "en-US", "en-GB"],
        "quiet": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        msg = str(e).lower()
        if "private" in msg or "unavailable" in msg or "removed" in msg:
            raise YouTubeImportError("This video is unavailable (private, region-blocked, or removed).")
        if "blocked" in msg or "sign in" in msg or "captcha" in msg:
            raise YouTubeImportError(
                "yt-dlp was also blocked by YouTube on this host. Both paths failed."
            )
        raise YouTubeImportError(f"yt-dlp: {e}")
    except Exception as e:
        raise YouTubeImportError(f"yt-dlp error: {e}")

    subs = info.get("subtitles") or {}
    auto = info.get("automatic_captions") or {}

    # Prefer manual English subs; fall back to auto-generated, then any language.
    chosen_formats = None
    for src in (subs, auto):
        for lang in ("en", "en-US", "en-GB"):
            if lang in src:
                chosen_formats = src[lang]
                break
        if chosen_formats:
            break
    if not chosen_formats:
        # Any language at all
        for src in (subs, auto):
            for lang in src:
                chosen_formats = src[lang]
                break
            if chosen_formats:
                break

    if not chosen_formats:
        raise YouTubeImportError("No captions available for this video.")

    # Look for json3 (structured timestamps); else srv3 / srv1 also have timestamps.
    json3 = next((f for f in chosen_formats if f.get("ext") == "json3"), None)
    if not json3:
        raise YouTubeImportError("yt-dlp returned captions, but no json3 format.")

    try:
        with request.urlopen(json3["url"], timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        raise YouTubeImportError(f"yt-dlp fetched the caption URL but downloading it failed: {e}")

    segments: List[Dict] = []
    for ev in data.get("events", []) or []:
        text = "".join(s.get("utf8", "") for s in (ev.get("segs") or [])).strip()
        if not text:
            continue
        start = ev.get("tStartMs", 0) / 1000.0
        duration = ev.get("dDurationMs", 0) / 1000.0
        segments.append({"text": text, "start": float(start), "duration": float(duration)})

    if not segments:
        raise YouTubeImportError("Transcript was empty.")
    return segments
