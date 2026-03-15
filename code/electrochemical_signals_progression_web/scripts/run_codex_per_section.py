#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple


SECTION_RE = re.compile(r"^#\s+(.+?)\s*$")


def parse_sections(markdown_text: str) -> List[Tuple[str, str]]:
    sections: List[Tuple[str, str]] = []
    current_title: str | None = None
    current_lines: List[str] = []

    for raw_line in markdown_text.splitlines():
        m = SECTION_RE.match(raw_line)
        if m:
            if current_title is not None:
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append((current_title, body))
            current_title = m.group(1).strip()
            current_lines = []
            continue

        if current_title is not None:
            current_lines.append(raw_line)

    if current_title is not None:
        body = "\n".join(current_lines).strip()
        if body:
            sections.append((current_title, body))

    return sections


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower()).strip("_")
    return slug or "section"


def build_prompt(section_title: str, section_body: str, request_file: str) -> str:
    return (
        "Process only this section from change requests and make code changes in the current repository.\n"
        f"Source file: {request_file}\n"
        f"Section title: {section_title}\n\n"
        "Requirements:\n"
        "- Implement all bullet requests in this section only.\n"
        "- Do not modify requests from other sections.\n"
        "- Run relevant checks/build before finishing if possible.\n"
        "- Provide a concise final summary of files changed and why.\n\n"
        "Section content:\n"
        f"# {section_title}\n\n{section_body}\n"
    )


def launch_codex(
    prompt: str,
    repo_dir: Path,
    output_log: Path,
    model: str | None,
    dry_run: bool,
) -> subprocess.Popen | None:
    cmd = ["codex", "exec", "--cd", str(repo_dir), "--full-auto", "-"]
    if model:
        cmd[2:2] = ["--model", model]

    if dry_run:
        print("[dry-run]", " ".join(cmd))
        print(f"[dry-run] log: {output_log}")
        return None

    output_log.parent.mkdir(parents=True, exist_ok=True)
    log_fp = output_log.open("w", encoding="utf-8")
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=log_fp,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=str(repo_dir),
    )
    assert proc.stdin is not None
    proc.stdin.write(prompt)
    proc.stdin.close()
    return proc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Launch one Codex exec process per top-level # section in a markdown file."
    )
    parser.add_argument(
        "--file",
        default="change_requests.md",
        help="Path to markdown file with top-level # sections (default: change_requests.md)",
    )
    parser.add_argument(
        "--out-dir",
        default="logs/codex_sections",
        help="Directory to store per-section prompts and logs",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Optional model to pass to codex exec",
    )
    parser.add_argument(
        "--sequential",
        action="store_true",
        help="Run sections sequentially (default runs in parallel/background)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned launches without running Codex",
    )

    args = parser.parse_args()

    repo_dir = Path.cwd()
    request_path = (repo_dir / args.file).resolve()
    if not request_path.exists():
        print(f"Error: request file not found: {request_path}", file=sys.stderr)
        return 1

    sections = parse_sections(request_path.read_text(encoding="utf-8"))
    if not sections:
        print("No top-level # sections with body content found.", file=sys.stderr)
        return 1

    run_stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = (repo_dir / args.out_dir / run_stamp).resolve()
    run_dir.mkdir(parents=True, exist_ok=True)

    print(f"Found {len(sections)} sections in {request_path.name}")
    print(f"Run directory: {run_dir}")

    procs: List[Tuple[str, Path, subprocess.Popen]] = []

    for idx, (title, body) in enumerate(sections, start=1):
        slug = slugify(title)
        base = f"{idx:02d}_{slug}"
        prompt_path = run_dir / f"{base}.prompt.txt"
        log_path = run_dir / f"{base}.log"
        prompt = build_prompt(title, body, request_path.name)
        prompt_path.write_text(prompt, encoding="utf-8")

        if args.sequential:
            if args.dry_run:
                print(f"\nSection {idx}: {title}")
                launch_codex(prompt, repo_dir, log_path, args.model, dry_run=True)
                continue

            print(f"\nRunning section {idx}/{len(sections)}: {title}")
            proc = launch_codex(prompt, repo_dir, log_path, args.model, dry_run=False)
            assert proc is not None
            code = proc.wait()
            print(f"Finished: exit={code} log={log_path}")
        else:
            print(f"Launching section {idx}/{len(sections)}: {title}")
            proc = launch_codex(prompt, repo_dir, log_path, args.model, args.dry_run)
            if proc is not None:
                procs.append((title, log_path, proc))
                print(f"  pid={proc.pid} log={log_path}")

    if args.dry_run:
        print("\nDry run complete.")
        return 0

    if not args.sequential:
        print("\nLaunched all sections in parallel.")
        print("Waiting for completion...")
        failures = 0
        for title, log_path, proc in procs:
            code = proc.wait()
            status = "ok" if code == 0 else f"failed({code})"
            if code != 0:
                failures += 1
            print(f"- {title}: {status} log={log_path}")
        return 1 if failures else 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
