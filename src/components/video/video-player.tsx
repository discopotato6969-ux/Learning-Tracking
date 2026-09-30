"use client"

import { ExternalLink, Maximize, Pause, Play, Volume2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import type { VideoSource } from "@/data/courses"

interface VideoPlayerProps {
  video: VideoSource
  lessonId?: string
}

interface YouTubePlayer {
  getPlaylistIndex: () => number
  loadPlaylist: (options: { listType: string; list: string; index: number }) => void
  loadVideoById: (options: { videoId: string }) => void
  destroy: () => void
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: { events: { onReady: () => void; onStateChange: () => void } }) => YouTubePlayer
  PlayerState: { PLAYING: number }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

function loadYouTubeApi() {
  if (window.YT) return Promise.resolve(window.YT)
  return new Promise<YouTubeApi>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      if (window.YT) resolve(window.YT)
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      document.head.appendChild(script)
    }
  })
}

function PlaylistPlayer({ playlistId, lessonId }: { playlistId: string; lessonId?: string }) {
  const playerElement = useRef<HTMLDivElement>(null)
  const player = useRef<YouTubePlayer | null>(null)
  const [savedIndex, setSavedIndex] = useState(0)
  const [playlistItems, setPlaylistItems] = useState<Array<{ videoId: string; title: string; thumbnail?: string; position: number }>>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!lessonId) return
    const localIndex = Number.parseInt(window.localStorage.getItem(`playlist:${lessonId}`) ?? "0", 10)
    Promise.resolve().then(() => setSavedIndex(Number.isNaN(localIndex) ? 0 : localIndex))
    fetch("/api/progress").then((response) => response.json()).then((store: { lessons?: Record<string, { playlistIndex?: number }> }) => {
      const index = store.lessons?.[lessonId]?.playlistIndex
      if (typeof index === "number") setSavedIndex(index)
    }).catch(() => undefined)
  }, [lessonId])

  useEffect(() => {
    fetch(`/api/youtube/playlist?playlistId=${encodeURIComponent(playlistId)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Playlist request failed")))
      .then((data: { items?: Array<{ videoId: string; title: string; thumbnail?: string; position: number }> }) => setPlaylistItems(data.items ?? []))
      .catch(() => setPlaylistItems([]))
  }, [playlistId])

  useEffect(() => {
    let disposed = false
    loadYouTubeApi().then((youtube) => {
      if (disposed || !playerElement.current) return
      player.current = new youtube.Player(playerElement.current, {
        events: {
          onReady: () => player.current?.loadPlaylist({ listType: "playlist", list: playlistId, index: savedIndex }),
          onStateChange: () => {
            const index = player.current?.getPlaylistIndex()
            if (lessonId && typeof index === "number" && index >= 0) {
              setActiveIndex(index)
              window.localStorage.setItem(`playlist:${lessonId}`, String(index))
              fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, playlistIndex: index }) }).catch(() => undefined)
            }
          },
        },
      })
    })
    return () => {
      disposed = true
      player.current?.destroy()
    }
  }, [lessonId, playlistId, savedIndex])

  return (
    <div className="overflow-hidden rounded-xl border bg-black shadow-sm">
      <div ref={playerElement} className="aspect-video w-full" />
      <div className="bg-background">
        <div className="border-b px-4 py-3"><p className="text-sm font-medium">Playlist videos</p><p className="mt-1 text-xs text-muted-foreground">{playlistItems.length > 0 ? `${playlistItems.length} videos` : "Loading playlist videos..."}</p></div>
        {playlistItems.length > 0 && <ol className="max-h-72 overflow-y-auto p-2">{playlistItems.map((item, index) => <li key={item.videoId}><button type="button" onClick={() => { player.current?.loadVideoById({ videoId: item.videoId }); setActiveIndex(index) }} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${index === activeIndex ? "bg-muted" : ""}`}><span className="w-6 shrink-0 text-center text-xs text-muted-foreground">{index + 1}</span>{item.thumbnail ? <Image src={item.thumbnail} alt="" width={64} height={40} className="h-10 w-16 shrink-0 rounded object-cover" /> : <span className="h-10 w-16 shrink-0 rounded bg-muted" />}<span className="min-w-0 flex-1 truncate text-sm">{item.title}</span></button></li>)}</ol>}
      </div>
    </div>
  )
}

export default function VideoPlayer({ video, lessonId }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (video.provider === "google-drive" && video.url?.includes("/folders/")) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded-xl border bg-zinc-950 px-6 text-center text-white shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-white/10"><ExternalLink className="size-6" aria-hidden="true" /></div>
        <div><h2 className="text-lg font-semibold">Course materials are in Google Drive</h2><p className="mt-1 max-w-md text-sm text-white/60">This lesson points to a Drive folder. Open it to access the lesson files and videos.</p></div>
        <Link href={video.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ExternalLink className="size-4" aria-hidden="true" />Open in Google Drive</Link>
      </div>
    )
  }

  if (video.provider === "google-drive" && video.fileId) {
    return <iframe title="Course video" src={`https://drive.google.com/file/d/${video.fileId}/preview`} className="aspect-video w-full rounded-xl border bg-black shadow-sm" allow="autoplay; fullscreen" />
  }

  if (video.provider === "youtube" && video.videoId) {
    return <iframe title="YouTube course video" src={`https://www.youtube-nocookie.com/embed/${video.videoId}${video.startTime ? `?start=${video.startTime}` : ""}`} className="aspect-video w-full rounded-xl border bg-black shadow-sm" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  }

  if (video.provider === "youtube" && video.playlistId) {
    return <PlaylistPlayer playlistId={video.playlistId} lessonId={lessonId} />
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-zinc-950 shadow-sm">
      <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_center,_#3f3f46,_#18181b_60%,_#09090b)]">
        <button type="button" aria-label={isPlaying ? "Pause video" : "Play video"} onClick={() => setIsPlaying((playing) => !playing)} className="flex size-16 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
          {isPlaying ? <Pause className="size-6 fill-current" aria-hidden="true" /> : <Play className="ml-1 size-6 fill-current" aria-hidden="true" />}
        </button>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-white">
          <button type="button" aria-label={isPlaying ? "Pause video" : "Play video"} onClick={() => setIsPlaying((playing) => !playing)} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Play className="size-4 fill-current" aria-hidden="true" /></button>
          <div className="h-1 flex-1 rounded-full bg-white/25"><div className="h-full w-1/4 rounded-full bg-white" /></div>
          <button type="button" aria-label="Toggle volume" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Volume2 className="size-4" aria-hidden="true" /></button>
          <button type="button" aria-label="Enter fullscreen" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Maximize className="size-4" aria-hidden="true" /></button>
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">{video.provider} preview</span>
      </div>
    </div>
  )
}
