
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
}
export interface DockerImage {
  id: string;
  tags: string[];
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getContainers() {
  return apiRequest<DockerContainer[]>("/api/containers");
}

export function getImages() {
  return apiRequest<DockerImage[]>("/api/images");
}

export function startContainer(id: string) {
  return apiRequest(`/api/containers/${id}/start`, {
    method: "POST",
  });
}

export function stopContainer(id: string) {
  return apiRequest(`/api/containers/${id}/stop`, {
    method: "POST",
  });
}

export function restartContainer(id: string) {
  return apiRequest(`/api/containers/${id}/restart`, {
    method: "POST",
  });
}

export function removeContainer(id: string) {
  return apiRequest(`/api/containers/${id}`, {
    method: "DELETE",
  });
}

export function getContainerLogs(id: string) {
  return apiRequest<string>(
    `/api/containers/${id}/logs`
  );
}

export function checkBackendHealth() {
  return apiRequest<{ status: string; docker: string }>(
    "/api/health"
  );
}


export function pullImage(image: string) {
  return apiRequest<{ message: string; id: string; tags: string[] }>(
    "/api/images/pull",
    {
      method: "POST",
      body: JSON.stringify({ image }),
    }
  );
}

export function buildImage(data: {
  image_tag: string;
  page_title: string;
  page_message: string;
}) {
  return apiRequest<{ message: string; id: string; tags: string[] }>(
    "/api/images/build",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function removeImage(imageId: string) {
  return apiRequest<{ message: string }>(
    `/api/images/${encodeURIComponent(imageId)}`,
    {
      method: "DELETE",
    }
  );
}


export interface CreateContainerRequest {
  name: string
  image: string
  host_port: number
  container_port: number
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
}

export interface DockerImage {
  id: string;
  tags: string[];
}
export interface CreateContainerRequest {
  name: string;
  image: string;
  host_port: number;
  container_port: number;
}

export function createContainer(data: CreateContainerRequest) {
  return apiRequest<{
    message: string;
    id: string;
    name: string;
    image: string;
    status: string;
    url: string;
  }>("/api/containers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}