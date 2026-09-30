import { NextResponse } from "next/server"
import { authorize } from "@/lib/session"

interface YouTubePlaylistItem {
  contentDetails?: { videoId?: string }
  snippet?: {
    position?: number
    title?: string
    thumbnails?: { medium?: { url?: string } }
  }
}

interface YouTubePlaylistResponse {
  items?: YouTubePlaylistItem[]
  nextPageToken?: string
}

export async function GET(request: Request) {
  const denied = await authorize(); if (denied) return denied
  const playlistId = new URL(request.url).searchParams.get("playlistId")
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!playlistId || !apiKey) {
    return NextResponse.json({ error: "A playlist ID and YouTube API key are required." }, { status: 400 })
  }

  const items: YouTubePlaylistItem[] = []
  let pageToken = ""

  try {
    do {
      const params = new URLSearchParams({
        part: "snippet,contentDetails",
        maxResults: "50",
        playlistId,
        key: apiKey,
      })
      if (pageToken) params.set("pageToken", pageToken)

      const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
        next: { revalidate: 3600 },
      })
      if (!response.ok) {
        return NextResponse.json({ error: "YouTube could not load this playlist." }, { status: response.status })
      }

      const page = await response.json() as YouTubePlaylistResponse
      items.push(...(page.items ?? []))
      pageToken = page.nextPageToken ?? ""
    } while (pageToken)

    return NextResponse.json({
      items: items
        .map((item) => ({
          videoId: item.contentDetails?.videoId,
          title: item.snippet?.title ?? "Untitled video",
          thumbnail: item.snippet?.thumbnails?.medium?.url,
          position: item.snippet?.position ?? 0,
        }))
        .filter((item): item is { videoId: string; title: string; thumbnail: string | undefined; position: number } => Boolean(item.videoId)),
    })
  } catch {
    return NextResponse.json({ error: "Unable to reach the YouTube API." }, { status: 502 })
  }
}
