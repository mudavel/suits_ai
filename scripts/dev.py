"""Run Vite and the API in one terminal; reload Python and the selected .env."""
import argparse
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / 'src' / 'frontend'


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, default=ROOT / '.env')
    parser.add_argument('--database', type=Path)
    parser.add_argument('--api-port', type=int, default=8000)
    parser.add_argument('--web-port', type=int, default=5173)
    parser.add_argument('--worker', action='store_true', help=argparse.SUPPRESS)
    return parser.parse_args()


def watch_snapshot(env_file):
    paths = [env_file]
    for folder in ('backend', 'policy', 'monitor'):
        paths.extend((ROOT / 'src' / folder).rglob('*.py'))
    result = {}
    for path in paths:
        try:
            stat = path.stat()
            result[str(path)] = (stat.st_mtime_ns, stat.st_size)
        except FileNotFoundError:
            result[str(path)] = None
    return result


def spawn(command, cwd, env):
    options = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}
    # Vite must not switch the shared terminal to raw input and consume Ctrl+C.
    return subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.DEVNULL, **options)


def stop(process):
    if process is None or process.poll() is not None:
        return
    try:
        if os.name == 'nt':
            process.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=8)
    except (OSError, subprocess.TimeoutExpired):
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True, check=False)
        else:
            os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=8)


def main():
    args = arguments()
    args.env_file = args.env_file.resolve()
    if args.worker:
        sys.path.insert(0, str(ROOT))
        from dotenv import load_dotenv
        load_dotenv(args.env_file, override=False)
        if args.database:
            os.environ['SUITS_DATABASE_PATH'] = str(args.database.resolve())
        os.environ.setdefault('SUITS_ARTIFACTS_DIR', str(ROOT / 'artefacts' / 'Hackaton Unicamp'))
        from src.backend.main import app
        import uvicorn
        uvicorn.run(app, host='127.0.0.1', port=args.api_port)
        return 0

    if os.name == 'nt':
        signal.signal(signal.SIGBREAK, signal.default_int_handler)

    node = shutil.which('node')
    vite = FRONTEND / 'node_modules' / 'vite' / 'bin' / 'vite.js'
    if not node or not vite.is_file():
        raise SystemExit('Instale Node.js e execute npm ci em src/frontend antes de iniciar.')
    for port in (args.api_port, args.web_port):
        with socket.socket() as listener:
            try:
                listener.bind(('127.0.0.1', port))
            except OSError:
                raise SystemExit(f'A porta {port} já está ocupada. Encerre o servidor anterior com Ctrl+C.')
    env = {**os.environ, 'PYTHONUTF8': '1', 'SUITS_API_PROXY_TARGET': f'http://127.0.0.1:{args.api_port}'}
    worker = [sys.executable, '-B', str(Path(__file__).resolve()), '--worker',
              '--env-file', str(args.env_file), '--api-port', str(args.api_port)]
    if args.database:
        worker.extend(['--database', str(args.database.resolve())])
    stamp = watch_snapshot(args.env_file)
    api, web = None, None
    print(f'Site: http://127.0.0.1:{args.web_port} | API: http://127.0.0.1:{args.api_port}', flush=True)
    print(f'Configuração: {args.env_file}', flush=True)
    print('Python e .env recarregam automaticamente. Ctrl+C encerra os dois servidores.', flush=True)
    try:
        api = spawn(worker, ROOT, env)
        web = spawn([node, str(vite), '--host', '127.0.0.1', '--port', str(args.web_port), '--strictPort', '--clearScreen', 'false'], FRONTEND, env)
        while True:
            time.sleep(0.5)
            updated = watch_snapshot(args.env_file)
            if updated != stamp:
                stamp = updated
                print('\nCódigo Python ou .env alterado; reiniciando a API...', flush=True)
                stop(api)
                api = spawn(worker, ROOT, env)
            if web.poll() is not None:
                print('O Vite foi encerrado.', flush=True)
                return web.returncode or 1
            if api.poll() is not None:
                # Keep watching so fixing a Python/.env startup error recovers the API.
                if api.returncode != 0 and not getattr(api, '_reported', False):
                    print('A API parou com erro. Corrija o código ou o .env para tentar novamente.', flush=True)
                    api._reported = True
    except KeyboardInterrupt:
        print('\nEncerrando o ambiente de desenvolvimento...', flush=True)
        return 0
    finally:
        stop(web)
        stop(api)


if __name__ == '__main__':
    sys.exit(main())
