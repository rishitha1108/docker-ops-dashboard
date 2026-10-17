
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from docker.errors import (
    DockerException,
    NotFound,
    APIError,
    ImageNotFound,
    BuildError,
)
import docker
import tempfile
from pathlib import Path

app = FastAPI(title="DockerOps Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = docker.from_env()


# Request model for creating containers
class ContainerCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    image: str = Field(min_length=1, max_length=200)
    host_port: int = Field(ge=1, le=65535)
    container_port: int = Field(default=80, ge=1, le=65535)


# Request model for pulling an image
class ImagePullRequest(BaseModel):
    image: str = Field(min_length=1, max_length=200)


# Request model for building a custom web image
class ImageBuildRequest(BaseModel):
    image_tag: str = Field(min_length=1, max_length=200)
    page_title: str = Field(default="My Docker Web Service", max_length=100)
    page_message: str = Field(
        default="Successfully deployed using DockerOps!",
        max_length=500,
    )


# Check Docker connection
@app.get("/api/health")
def health():
    try:
        client.ping()
        return {"status": "healthy", "docker": "connected"}
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# List all containers, including stopped containers
@app.get("/api/containers")
def get_containers():
    try:
        containers = client.containers.list(all=True)
        results = []

        for container in containers:
            container.reload()
            image_tags = container.image.tags

            results.append({
                "id": container.short_id,
                "name": container.name,
                "image": image_tags[0] if image_tags else container.image.short_id,
                "status": container.status,
            })

        return results

    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# List locally available images
@app.get("/api/images")
def get_images():
    try:
        images = client.images.list()

        return [
            {
                "id": image.short_id,
                "tags": image.tags,
            }
            for image in images
        ]

    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Pull an image from Docker Hub
@app.post("/api/images/pull")
def pull_image(request: ImagePullRequest):
    try:
        image = client.images.pull(request.image)

        return {
            "message": "Image pulled successfully",
            "id": image.short_id,
            "tags": image.tags,
        }

    except ImageNotFound:
        raise HTTPException(
            status_code=404,
            detail="Image not found. Check the image name and tag.",
        )
    except APIError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Build a custom Nginx web-service image
@app.post("/api/images/build", status_code=201)
def build_image(request: ImageBuildRequest):
    try:
        # Create a temporary folder for the Docker build context.
        with tempfile.TemporaryDirectory() as temp_dir:
            build_path = Path(temp_dir)

            # Create the HTML page that the container will serve.
            html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{request.page_title}</title>
</head>
<body style="font-family: Arial; text-align: center; padding: 60px;">
    <h1>{request.page_title}</h1>
    <p>{request.page_message}</p>
    <p>Served by Nginx inside a Docker container.</p>
</body>
</html>
"""

            # Write the webpage into the build context.
            (build_path / "index.html").write_text(
                html,
                encoding="utf-8",
            )

            # Define how Docker builds the custom image.
            dockerfile = """FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
"""

            # Write the Dockerfile.
            (build_path / "Dockerfile").write_text(
                dockerfile,
                encoding="utf-8",
            )

            # Build the image and assign its tag.
            image, build_logs = client.images.build(
                path=str(build_path),
                dockerfile="Dockerfile",
                tag=request.image_tag,
                rm=True,
            )

            # Return the resulting image information.
            return {
                "message": "Custom image built successfully",
                "id": image.short_id,
                "tags": image.tags,
            }

    except BuildError as error:
        details = "".join(
            item.get("stream", "")
            for item in error.build_log
            if isinstance(item, dict)
        )
        raise HTTPException(
            status_code=400,
            detail=details or str(error),
        )
    except APIError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Remove a local image
@app.delete("/api/images/{image_id}")
def remove_image(image_id: str):
    try:
        image = client.images.get(image_id)
        image_tags = image.tags
        image.remove(force=False)

        return {
            "message": "Image removed successfully",
            "id": image_id,
            "tags": image_tags,
        }

    except NotFound:
        raise HTTPException(status_code=404, detail="Image not found")
    except APIError as error:
        raise HTTPException(
            status_code=409,
            detail=(
                "Image could not be removed. A container may still be using it. "
                + str(error)
            ),
        )
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Find a container by ID or name
def get_container_or_404(container_id: str):
    try:
        return client.containers.get(container_id)
    except NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Create and start a container from a local image
@app.post("/api/containers", status_code=201)
def create_container(request: ContainerCreateRequest):
    try:
        try:
            image = client.images.get(request.image)
        except NotFound:
            raise HTTPException(
                status_code=404,
                detail="Image not found locally. Pull the image first.",
            )

        try:
            client.containers.get(request.name)
            raise HTTPException(
                status_code=409,
                detail="A container with this name already exists.",
            )
        except NotFound:
            pass

        container = client.containers.run(
            image=image.id,
            name=request.name,
            detach=True,
            ports={
                f"{request.container_port}/tcp": request.host_port
            },
        )

        container.reload()

        return {
            "message": "Container created and started successfully",
            "id": container.short_id,
            "name": container.name,
            "image": request.image,
            "status": container.status,
            "url": f"http://localhost:{request.host_port}",
        }

    except HTTPException:
        raise
    except APIError as error:
        raise HTTPException(status_code=409, detail=str(error))
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Start a container
@app.post("/api/containers/{container_id}/start")
def start_container(container_id: str):
    container = get_container_or_404(container_id)

    try:
        container.start()
        container.reload()

        return {
            "message": "Container started successfully",
            "id": container.short_id,
            "name": container.name,
            "status": container.status,
        }

    except APIError as error:
        raise HTTPException(status_code=409, detail=str(error))
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Stop a container
@app.post("/api/containers/{container_id}/stop")
def stop_container(container_id: str):
    container = get_container_or_404(container_id)

    try:
        container.stop(timeout=10)
        container.reload()

        return {
            "message": "Container stopped successfully",
            "id": container.short_id,
            "name": container.name,
            "status": container.status,
        }

    except APIError as error:
        raise HTTPException(status_code=409, detail=str(error))
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Restart a container
@app.post("/api/containers/{container_id}/restart")
def restart_container(container_id: str):
    container = get_container_or_404(container_id)

    try:
        container.restart(timeout=10)
        container.reload()

        return {
            "message": "Container restarted successfully",
            "id": container.short_id,
            "name": container.name,
            "status": container.status,
        }

    except APIError as error:
        raise HTTPException(status_code=409, detail=str(error))
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Remove a stopped container
@app.delete("/api/containers/{container_id}")
def remove_container(container_id: str):
    container = get_container_or_404(container_id)

    try:
        name = container.name
        container.remove(force=False)

        return {
            "message": "Container removed successfully",
            "name": name,
        }

    except APIError as error:
        raise HTTPException(
            status_code=409,
            detail=(
                "Stop the container before removing it, or check Docker's error: "
                + str(error)
            ),
        )
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))


# Read container logs
@app.get("/api/containers/{container_id}/logs")
def get_container_logs(container_id: str, tail: int = 100):
    container = get_container_or_404(container_id)

    try:
        logs = container.logs(
            stdout=True,
            stderr=True,
            tail=max(1, min(tail, 1000)),
            timestamps=True,
        ).decode("utf-8", errors="replace")

        return {
            "id": container.short_id,
            "name": container.name,
            "logs": logs,
        }

    except APIError as error:
        raise HTTPException(status_code=409, detail=str(error))
    except DockerException as error:
        raise HTTPException(status_code=503, detail=str(error))
