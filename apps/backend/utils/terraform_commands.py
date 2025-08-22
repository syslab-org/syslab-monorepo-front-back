import subprocess

def terraform_init():
    try:
        dir = "<<directorio>>"
        subprocess.run(["terraform", "init"], cwd=dir,check=True)
    except subprocess.CalledProcessError as error:
        print(f"Error executing: {error}")

def terraform_apply():
    try:
        dir = "<<directorio>>"
        subprocess.run(["terraform", "apply", "-auto-approve"], cwd=dir,check=True)
    except subprocess.CalledProcessError as error:
        print(f"Error executing: {error}")

def terraform_destroy():
    try:
        dir = "<<directorio>>"
        subprocess.run(["terraform", "destroy", "-auto-approve"], cwd=dir,check=True)
