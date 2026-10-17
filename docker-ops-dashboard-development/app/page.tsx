'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getContainers,
  getImages,
  pullImage,
  buildImage,
  removeImage,
  createContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerLogs,
  checkBackendHealth,
  type DockerContainer,
  type DockerImage,
} from "@/docker-api";

import {
  Activity,
  Box,
  Container,
  LayoutDashboard,
  Menu,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trash2,
  TrendingUp,
  Wifi,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PageKey = 'Overview' | 'Containers' | 'Images'
const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Containers', icon: Container },
  { label: 'Images', icon: Box },
] as const

function StatusBadge({ status }: { status: string }) {
  const running = status.toLowerCase() === 'running'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        running
          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
          : 'border-slate-400/20 bg-slate-400/10 text-slate-400',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          running ? 'bg-emerald-400' : 'bg-slate-500',
        )}
      />
      {status}
    </span>
  )
}

function Sidebar({
  active,
  setActive,
  mobileOpen,
  setMobileOpen,
}: {
  active: PageKey
  setActive: (page: PageKey) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}) {
  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.07] bg-[#0b1020] px-4 py-5 transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500">
            <Container className="size-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">
              Docker<span className="text-blue-400">Ops</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Control center
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-slate-400 lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Workspace
        </p>

        <nav className="mt-3 flex flex-col gap-1">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setActive(label)
                setMobileOpen(false)
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition',
                active === label
                  ? 'bg-blue-500/15 text-blue-300'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
          <div className="flex items-center gap-2">
            <Wifi className="size-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              Docker connection
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Manage your local containers and images through the FastAPI backend.
          </p>
          <p className="mt-3 text-[10px] text-slate-500">
            localhost:8000
          </p>
        </div>
      </aside>
    </>
  )
}

function Header({
  active,
  setMobileOpen,
}: {
  active: PageKey
  setMobileOpen: (open: boolean) => void
}) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-slate-400 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-slate-300">{active}</span>
          </div>
          <h1 className="mt-1 text-lg font-semibold text-white">
            {active === 'Overview' ? 'Infrastructure overview' : `${active} manager`}
          </h1>
        </div>
      </div>

      <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-xs text-emerald-300 sm:flex">
        <span className="size-2 rounded-full bg-emerald-400" />
        Docker workspace
      </div>
    </header>
  )
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  description: string
  icon: typeof Container
  color: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5 transition hover:border-white/[0.15] hover:bg-white/[0.05]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
          <Icon className={cn('size-5', color)} />
        </div>
      </div>
    </div>
  )
}

function Overview({ setActive }: { setActive: (page: PageKey) => void }) {
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [images, setImages] = useState<DockerImage[]>([])
  const [error, setError] = useState('')

  async function loadOverview() {
    try {
      setError('')
      const [containerData, imageData] = await Promise.all([
        getContainers(),
        getImages(),
      ])
      setContainers(containerData)
      setImages(imageData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load Docker information',
      )
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  const runningCount = containers.filter(
    (item) => item.status.toLowerCase() === 'running',
  ).length

  const stoppedCount = containers.length - runningCount

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Your infrastructure, at a glance.
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Monitor and manage your local Docker environment.
          </p>
        </div>
        <button
          onClick={() => void loadOverview()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-blue-400"
        >
          <RefreshCw className="size-4" />
          Refresh overview
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total containers"
          value={String(containers.length)}
          description="Containers in your Docker engine"
          icon={Container}
          color="text-blue-400"
        />
        <MetricCard
          label="Running containers"
          value={String(runningCount)}
          description="Currently active"
          icon={Activity}
          color="text-emerald-400"
        />
        <MetricCard
          label="Stopped containers"
          value={String(stoppedCount)}
          description="Not currently running"
          icon={Square}
          color="text-amber-400"
        />
        <MetricCard
          label="Docker images"
          value={String(images.length)}
          description="Images available locally"
          icon={Box}
          color="text-violet-400"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Recent containers</h3>
              <p className="mt-1 text-xs text-slate-500">
                Actual Docker container data
              </p>
            </div>
            <button
              onClick={() => setActive('Containers')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {containers.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-white/[0.05]">
                  <Container className="size-4 text-slate-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{item.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {item.image}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}

            {containers.length === 0 && !error && (
              <p className="py-5 text-sm text-slate-500">
                No containers found.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Local images</h3>
              <p className="mt-1 text-xs text-slate-500">
                Images stored in your Docker engine
              </p>
            </div>
            <button
              onClick={() => setActive('Images')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {images.slice(0, 4).map((image) => (
              <div key={image.id} className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-violet-400/10">
                  <Box className="size-4 text-violet-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">
                    {image.tags.length ? image.tags.join(', ') : 'Untagged image'}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-slate-500">
                    {image.id}
                  </p>
                </div>
              </div>
            ))}

            {images.length === 0 && !error && (
              <p className="py-5 text-sm text-slate-500">
                No Docker images found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


function ContainersPage() {
  const [items, setItems] = useState<DockerContainer[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState('')

  async function loadContainers() {
    try {
      setError('')
      setItems(await getContainers())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load containers',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadContainers()
  }, [])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const data = new FormData(form)

    try {
      setCreating(true)
      setError('')
      setSuccess('')

      const result = await createContainer({
        name: String(data.get('name')).trim(),
        image: String(data.get('image')),
        host_port: Number(data.get('host_port')),
        container_port: 80,
      })

      setSuccess(
        `Container "${result.name}" created successfully. Website: ${result.url}`,
      )

      form.reset()
      await loadContainers()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create container',
      )
    } finally {
      setCreating(false)
    }
  }

  async function handleAction(id: string, action: string) {
    if (action === 'remove') {
      const confirmed = window.confirm(
        'Remove this container? This cannot be undone.',
      )
      if (!confirmed) return
    }

    try {
      setBusyId(id)
      setError('')
      setSuccess('')

      if (action === 'start') await startContainer(id)
      if (action === 'stop') await stopContainer(id)
      if (action === 'restart') await restartContainer(id)
      if (action === 'remove') await removeContainer(id)

      await loadContainers()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Container action failed',
      )
    } finally {
      setBusyId(null)
    }
  }

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.image.toLowerCase().includes(query.toLowerCase()) ||
          item.id.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Container manager
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Create, start, stop, restart, and remove Docker containers.
        </p>
      </div>

      {/* Create container form */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
        <h3 className="text-lg font-semibold text-white">
          Create a container
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Launch a web service from an image stored in Docker.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <label className="text-sm text-slate-300">
            Container name
            <input
              name="name"
              required
              minLength={1}
              maxLength={100}
              placeholder="dockerops-v2-demo"
              className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950 px-3 text-white outline-none focus:border-blue-400/50"
            />
          </label>

          <label className="text-sm text-slate-300">
            Docker image
            <select
              name="image"
              required
              defaultValue="dockerops-demo:v2"
              className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950 px-3 text-white outline-none focus:border-blue-400/50"
            >
              <option value="dockerops-demo:v2">
                dockerops-demo:v2 — Custom website V2
              </option>
              <option value="dockerops-demo:v1">
                dockerops-demo:v1 — Custom website V1
              </option>
              <option value="nginx:latest">
                nginx:latest — Default Nginx website
              </option>
              <option value="httpd:alpine">
                httpd:alpine — Apache web server
              </option>
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Host port
            <input
              name="host_port"
              type="number"
              required
              min={1}
              max={65535}
              defaultValue={8085}
              className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950 px-3 text-white outline-none focus:border-blue-400/50"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Website will be available at localhost:8085
            </span>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="h-11 rounded-xl bg-blue-500 px-5 text-sm font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'Creating container...' : 'Create and start container'}
            </button>
          </div>
        </form>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
          {success}
          {success.includes('localhost:') && (
            <button
              onClick={() => window.open('http://localhost:8085', '_blank')}
              className="ml-3 underline"
            >
              Open website
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Search and refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search containers..."
          className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/40 sm:max-w-sm"
        />

        <button
          onClick={() => void loadContainers()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-xs font-medium text-white hover:bg-blue-400"
        >
          <RefreshCw className="size-4" />
          Refresh containers
        </button>
      </div>

      {/* Container table */}
      {loading ? (
        <p className="text-sm text-slate-400">
          Loading Docker containers...
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.035]">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                {['Container', 'Image', 'Status', 'Container ID', 'Actions'].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((item) => {
                const running = item.status.toLowerCase() === 'running'
                const busy = busyId === item.id

                return (
                  <tr key={item.id} className="hover:bg-white/[0.025]">
                    <td className="px-5 py-4 font-medium text-slate-200">
                      {item.name}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-400">
                      {item.image}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {item.id.slice(0, 12)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={busy || running}
                          onClick={() => void handleAction(item.id, 'start')}
                          title="Start container"
                          className="rounded-lg p-2 text-slate-400 hover:text-emerald-300 disabled:opacity-30"
                        >
                          <Play className="size-4" />
                        </button>

                        <button
                          disabled={busy || !running}
                          onClick={() => void handleAction(item.id, 'stop')}
                          title="Stop container"
                          className="rounded-lg p-2 text-slate-400 hover:text-amber-300 disabled:opacity-30"
                        >
                          <Square className="size-4" />
                        </button>

                        <button
                          disabled={busy}
                          onClick={() => void handleAction(item.id, 'restart')}
                          title="Restart container"
                          className="rounded-lg p-2 text-slate-400 hover:text-blue-300 disabled:opacity-30"
                        >
                          <RotateCcwIcon />
                        </button>

                        <button
                          disabled={busy}
                          onClick={() => void handleAction(item.id, 'remove')}
                          title="Remove container"
                          className="rounded-lg p-2 text-slate-400 hover:text-red-300 disabled:opacity-30"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!filtered.length && (
            <p className="p-8 text-center text-sm text-slate-400">
              {items.length
                ? 'No matching containers found.'
                : 'No Docker containers found.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function RotateCcwIcon() {
  return <RefreshCw className="size-4" />
}


function ImagesPage() {
  const [items, setItems] = useState<DockerImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const [pullName, setPullName] = useState('httpd:alpine')
  const [imageTag, setImageTag] = useState('dockerops-demo:v2')
  const [pageTitle, setPageTitle] = useState('My DockerOps Website V2')
  const [pageMessage, setPageMessage] = useState(
    'My second custom Docker image is working!'
  )

  async function loadImages() {
    try {
      setError('')
      setItems(await getImages())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load images'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadImages()
  }, [])

  async function handlePull() {
    if (!pullName.trim()) {
      setError('Enter an image name, for example httpd:alpine.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const result = await pullImage(pullName.trim())
      setMessage(result.message || 'Image pulled successfully.')
      await loadImages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image pull failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleBuild() {
    if (!imageTag.trim() || !pageTitle.trim() || !pageMessage.trim()) {
      setError('Complete all custom image fields before building.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const result = await buildImage({
        image_tag: imageTag.trim(),
        page_title: pageTitle.trim(),
        page_message: pageMessage.trim(),
      })

      setMessage(result.message || 'Custom image built successfully.')
      await loadImages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image build failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(image: DockerImage) {
    if (!window.confirm(`Remove image ${image.tags.join(', ') || image.id}?`)) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await removeImage(image.id)
      setMessage('Image removed successfully.')
      await loadImages()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not remove image. It may be used by a container.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Image manager</h2>
          <p className="mt-2 text-sm text-slate-400">
            Pull existing images and build custom images for web services.
          </p>
        </div>

        <button
          onClick={() => void loadImages()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-xs font-medium text-white hover:bg-blue-400 disabled:opacity-50"
        >
          <RefreshCw className="size-4" />
          Refresh images
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
          {message}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <h3 className="text-lg font-semibold text-white">Pull an image</h3>
          <p className="mt-2 text-sm text-slate-400">
            Download an image from a container registry into your local Docker engine.
          </p>

          <label className="mt-5 block text-sm text-slate-300">
            Image name
          </label>
          <input
            value={pullName}
            onChange={(e) => setPullName(e.target.value)}
            placeholder="httpd:alpine"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          />

          <button
            onClick={() => void handlePull()}
            disabled={busy}
            className="mt-4 rounded-xl bg-blue-500 px-4 py-3 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-50"
          >
            {busy ? 'Please wait...' : 'Pull image'}
          </button>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <h3 className="text-lg font-semibold text-white">Build a custom image</h3>
          <p className="mt-2 text-sm text-slate-400">
            Create a new image containing your own website title and message.
          </p>

          <label className="mt-4 block text-sm text-slate-300">
            Image tag
          </label>
          <input
            value={imageTag}
            onChange={(e) => setImageTag(e.target.value)}
            placeholder="dockerops-demo:v2"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          />

          <label className="mt-4 block text-sm text-slate-300">
            Website title
          </label>
          <input
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          />

          <label className="mt-4 block text-sm text-slate-300">
            Website message
          </label>
          <input
            value={pageMessage}
            onChange={(e) => setPageMessage(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          />

          <button
            onClick={() => void handleBuild()}
            disabled={busy}
            className="mt-4 rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50"
          >
            {busy ? 'Please wait...' : 'Build custom image'}
          </button>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h3 className="font-semibold text-white">Local Docker images</h3>
          <p className="mt-1 text-sm text-slate-400">
            Images stored on your computer.
          </p>
        </div>

        {loading ? (
          <p className="p-5 text-sm text-slate-400">Loading Docker images...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Repository and tag</th>
                  <th className="px-5 py-4 font-medium">Image ID</th>
                  <th className="px-5 py-4 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {items.map((image) => (
                  <tr key={image.id} className="hover:bg-white/[0.025]">
                    <td className="px-5 py-4 font-medium text-slate-200">
                      {image.tags.length ? image.tags.join(', ') : 'Untagged image'}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">
                      {image.id}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => void handleRemove(image)}
                        disabled={busy}
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-400">
                No Docker images found.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default function Page() {
  const [active, setActive] = useState<PageKey>('Overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-200">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[500px] rounded-full bg-blue-600/[0.07] blur-[120px]" />
        <div className="absolute right-0 top-1/3 size-[400px] rounded-full bg-violet-600/[0.06] blur-[120px]" />
      </div>

      <Sidebar
        active={active}
        setActive={setActive}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="relative lg:pl-64">
        <Header active={active} setMobileOpen={setMobileOpen} />

        <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
          {active === 'Overview' ? (
  <Overview setActive={setActive} />
) : active === 'Containers' ? (
  <ContainersPage />
) : (
  <ImagesPage />
)}
        </main>
      </div>
    </div>
  )
}