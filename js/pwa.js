// Version + Service Worker glue (spec §3, §4, §43). Browser-only.
//
// version.txt holds one line: the deploy UTC datetime, stamped by the Pages workflow.
// In the repo it is empty → local dev: no Service Worker, files always fresh.

const readVersion = async init => {
  const res = await fetch('version.txt', init)
  if (!res.ok) throw new Error(`version.txt: HTTP ${res.status}`)
  return (await res.text()).trim()
}

// Running version (from the Service Worker cache in production). '' = dev.
export const localVersion = () => readVersion()

// Version currently deployed on the server (bypasses the Service Worker cache).
export const remoteVersion = () => readVersion({ cache: 'no-store' })

export async function setup(version) {
  if (!('serviceWorker' in navigator)) return
  if (version) navigator.serviceWorker.register('service-worker.js').catch(e => console.warn('SW', e))
  else for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister()
}

// Drop the cached app and worker, then reload: everything (code and cards) comes from the network.
// Progress lives in localStorage and is untouched.
export async function reinstall() {
  for (const reg of await navigator.serviceWorker?.getRegistrations() ?? []) await reg.unregister()
  for (const key of await caches.keys()) await caches.delete(key)
  location.reload()
}
