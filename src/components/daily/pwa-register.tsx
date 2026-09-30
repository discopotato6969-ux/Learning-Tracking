"use client"
import { useEffect } from "react"
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined)
  }, [])
  return null
}
