import json
import os
import pathlib
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined


TEMPLATES_DIR = Path(__file__).resolve().parents[3] / "provisioning" / "templates"


@dataclass
class TerraformCommandResult:
    command: list[str]
    returncode: int
    stdout: str
    stderr: str

    def log_block(self) -> str:
        return f"$ {' '.join(self.command)}\n{self.stdout}\n{self.stderr}\n"


def run(cmd, cwd):
    """Ejecuta un comando y captura stdout/stderr sin levantar excepción."""
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=False)


def _run_terraform(command: list[str], cwd: str) -> TerraformCommandResult:
    proc = run(command, cwd=cwd)
    return TerraformCommandResult(
        command=command,
        returncode=proc.returncode,
        stdout=proc.stdout,
        stderr=proc.stderr,
    )


def read_outputs_json(cwd: str) -> dict:
    """Lee `terraform output -json` y devuelve un dict simplificado."""
    proc = run(["terraform", "output", "-json", "-no-color"], cwd=cwd)
    if proc.returncode != 0:
        raise RuntimeError(f"terraform output failed: {proc.stderr.strip()}")

    raw = (proc.stdout or "{}").strip() or "{}"
    data = json.loads(raw)

    simplified = {}
    for key, value in (data or {}).items():
        if isinstance(value, dict) and "value" in value:
            simplified[key] = value.get("value")
        else:
            simplified[key] = value
    return simplified


def render_workspace(plan_id: str, payload: dict, simulate_only: bool, prefix: str) -> tuple[str, str, str]:
    """Crea un workdir Terraform con backend local y main.tf renderizado."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        trim_blocks=True,
        lstrip_blocks=True,
        undefined=StrictUndefined,
    )
    tpl = env.get_template("main.tf.j2")
    tf_text = tpl.render(payload=payload, simulate_only=simulate_only)

    workdir = tempfile.mkdtemp(prefix=prefix)
    state_dir = f"/tfstate/{plan_id}"
    os.makedirs(state_dir, exist_ok=True)
    state_path = f"{state_dir}/terraform.tfstate"

    backend_tf = f"""terraform {{
        backend "local" {{
            path = "{state_path}"
        }}
    }}
    """.lstrip()

    pathlib.Path(os.path.join(workdir, "backend.tf")).write_text(backend_tf)
    pathlib.Path(os.path.join(workdir, "main.tf")).write_text(tf_text)
    return workdir, state_path, tf_text


def write_debug_dumps(workdir: str, payload: dict, tf_text: str) -> None:
    pathlib.Path(workdir, "_received_plan.json").write_text(
        json.dumps(payload, indent=2, default=str)
    )
    preview = "".join(tf_text.splitlines(True)[:60])
    pathlib.Path(workdir, "_main_preview.txt").write_text(preview)


def read_main_preview(workdir: str, lines: int = 40) -> str:
    return "".join(pathlib.Path(workdir, "main.tf").read_text().splitlines(True)[:lines])


def terraform_init(workdir: str):
    return _run_terraform(["terraform", "init", "-input=false", "-no-color"], cwd=workdir)


def terraform_plan(workdir: str, simulate_only: bool):
    return _run_terraform(
        [
        "terraform",
        "plan",
        "-input=false",
        "-refresh=false" if simulate_only else "-refresh=true",
        "-no-color",
        "-out",
        "plan.out",
        ],
        cwd=workdir,
    )


def terraform_apply(workdir: str):
    return _run_terraform(
        ["terraform", "apply", "-input=false", "-no-color", "plan.out"],
        cwd=workdir,
    )


def terraform_destroy(workdir: str):
    return _run_terraform(
        ["terraform", "destroy", "-auto-approve", "-no-color"],
        cwd=workdir,
    )


def ensure_init_succeeded(result: TerraformCommandResult) -> None:
    if result.returncode != 0:
        raise RuntimeError("terraform init failed")


def ensure_plan_succeeded(result: TerraformCommandResult) -> None:
    if result.returncode != 0:
        raise RuntimeError("terraform plan failed")


def ensure_apply_succeeded(result: TerraformCommandResult) -> None:
    if result.returncode == 0:
        return

    err_text = f"{result.stdout}\n{result.stderr}".lower()
    if "transitgatewaylimitexceeded" in err_text:
        raise RuntimeError(
            "terraform apply failed: TransitGatewayLimitExceeded. "
            "La cuenta alcanzó el límite de Transit Gateways en esta región."
        )
    if "invalidsubnetid.notfound" in err_text:
        raise RuntimeError(
            "terraform apply failed: InvalidSubnetID.NotFound. "
            "Se detectó drift: AWS ya no tiene una subnet referenciada en el state. "
            "Ejecuta Destroy del plan para limpiar estado y vuelve a aplicar."
        )
    raise RuntimeError("terraform apply failed")


def ensure_destroy_succeeded(result: TerraformCommandResult) -> None:
    if result.returncode != 0:
        raise RuntimeError("terraform destroy failed")
