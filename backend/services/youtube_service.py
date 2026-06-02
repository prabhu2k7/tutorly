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
    """Return transcript as a list of {text, start, duration} segments."""
    api = YouTubeTranscriptApi()
    try:
        try:
            fetched = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        except NoTranscriptFound:
            transcript_list = api.list(video_id)
            first = next(iter(transcript_list))
            fetched = first.fetch()
    except TranscriptsDisabled:
        raise YouTubeImportError(
            "Captions are disabled for this video — try a different one."
        )
    except VideoUnavailable:
        raise YouTubeImportError(
            "This video is unavailable (private, region-blocked, or removed)."
        )
    except InvalidVideoId:
        raise YouTubeImportError("That doesn't look like a valid YouTube video id.")
    except YouTubeTranscriptApiException as e:
        raise YouTubeImportError(f"Could not fetch transcript: {e}")
    except Exception:
        # Network / SSL / proxy / rate-limit failures from the hosting platform's
        # IP range. YouTube occasionally drops TLS handshakes from shared hosts
        # (Hugging Face Spaces is a known case). Surface as a clean 400 instead
        # of leaking a 500.
        raise YouTubeImportError(
            "Could not reach YouTube from this server. This usually means the host "
            "is being rate-limited by YouTube's TLS layer (common on shared hosting). "
            "Workaround: open the video on YouTube -> click '...' (More) -> 'Show transcript' "
            "-> copy the text -> save it as a .txt file -> use 'Upload Document' below."
        )

    segments: List[Dict] = []
    for s in fetched:
        text = getattr(s, "text", None)
        start = getattr(s, "start", None)
        duration = getattr(s, "duration", None)
        if text:
            segments.append(
                {
                    "text": text,
                    "start": float(start) if start is not None else 0.0,
                    "duration": float(duration) if duration is not None else 0.0,
                }
            )
    if not segments:
        raise YouTubeImportError("Transcript was empty.")
    return segments
