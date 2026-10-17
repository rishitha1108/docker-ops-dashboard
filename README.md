\# DockerOps Dashboard



A web-based dashboard for monitoring and managing Docker resources through a modern frontend and a FastAPI backend.



\## Overview



DockerOps Dashboard provides a graphical interface for working with Docker resources, making common container and image operations easier to access and understand.



\## Features



\- \*\*Docker Container Management:\*\* View and manage Docker containers.

\- \*\*Docker Image Management:\*\* View available Docker images.

\- \*\*Interactive Dashboard:\*\* Access Docker-related information through a web interface.

\- \*\*FastAPI Backend:\*\* Provides API endpoints for backend operations.

\- \*\*Modern Frontend:\*\* Built using Next.js and React.

\- \*\*API Documentation:\*\* Explore and test backend endpoints using Swagger UI.



\## Tech Stack



| Technology | Purpose |

|---|---|

| Next.js | Frontend framework |

| React | User interface |

| TypeScript | Type-safe frontend development |

| FastAPI | Backend API |

| Python | Backend programming |

| Docker | Containerization and resource management |

| Tailwind CSS | Styling |



\## Project Structure



```text

docker-ops-dashboard/

├── app/                 # Next.js application

├── backend/             # FastAPI backend

├── components/          # Reusable UI components

├── lib/                 # Shared utilities

├── public/              # Static assets

├── package.json         # Frontend dependencies and scripts

├── .gitignore           # Files excluded from Git

└── README.md            # Project documentation

```



\## Prerequisites



Install the following before running the project:



\- Node.js and npm

\- Python

\- Docker Desktop

\- Git



Make sure Docker Desktop is running before using Docker-related functionality.



\## Getting Started



\### 1. Clone the repository



```bash

git clone https://github.com/rishitha1108/docker-ops-dashboard.git

cd docker-ops-dashboard

```



\### 2. Start the frontend



Install the dependencies:



```bash

npm install

```



Run the development server:



```bash

npm run dev

```



Open the frontend at:



http://localhost:3000



\### 3. Start the backend



Open a \*\*second terminal\*\* in the project root.



On Windows PowerShell, run:



```powershell

.\\backend\\venv\\Scripts\\python.exe -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000

```



The backend will be available at:



http://127.0.0.1:8000



\### 4. Explore the API



Open the FastAPI Swagger documentation:



http://127.0.0.1:8000/docs



Use this page to inspect and test the available API endpoints.



\## Running with Docker



Ensure Docker Desktop is running and verify your Docker installation:



```bash

docker --version

docker run --rm hello-world

```



To start a sample Nginx container:



```bash

docker run -d --name dockerops-test nginx

```



Check running containers:



```bash

docker ps

```



Remove the test container when finished:



```bash

docker rm -f dockerops-test

```



\## Development Notes



\- Run the frontend and backend in separate terminals.

\- Keep Docker Desktop running when testing Docker operations.

\- Do not commit passwords, API keys, or local environment files.

\- Configure any required environment variables locally.



\## Future Improvements



\- Add container resource usage monitoring.

\- Improve container logs and status visualization.

\- Add advanced filtering and search for Docker resources.

\- Introduce additional operational insights and alerts.



\## Author



\*\*Rishitha Reddy\*\*



GitHub: \[rishitha1108](https://github.com/rishitha1108)



\## License



No license has been specified yet.



