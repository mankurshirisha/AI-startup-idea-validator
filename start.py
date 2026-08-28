"""
start.py (Root Launcher)
Forwards startup to backend/start.py while maintaining full backward compatibility
with existing Render, local, and CI/CD start commands (`python start.py`).
"""

import os
import subprocess
import sys


def main():
    repo_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(repo_root, "backend")
    backend_start = os.path.join(backend_dir, "start.py")

    if not os.path.exists(backend_start):
        print(f"[ERROR] Could not find backend start script at: {backend_start}", file=sys.stderr)
        sys.exit(1)

    # Propagate environment with backend in PYTHONPATH
    env = os.environ.copy()
    existing_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = (
        f"{backend_dir}{os.pathsep}{existing_pythonpath}"
        if existing_pythonpath
        else backend_dir
    )

    try:
        proc = subprocess.Popen(
            [sys.executable, backend_start] + sys.argv[1:],
            cwd=backend_dir,
            env=env,
        )
        proc.wait()
        sys.exit(proc.returncode)
    except KeyboardInterrupt:
        print("\n[STOPPING] Shutting down backend runner...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        sys.exit(0)


if __name__ == "__main__":
    main()