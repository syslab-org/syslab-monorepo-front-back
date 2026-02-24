.
├── Makefile
├── README.md
├── apps
│   ├── backend
│   │   ├── Dockerfile
│   │   ├── Screenshot 2025-08-30 at 12.32.47 am.png
│   │   ├── api
│   │   │   ├── **init**.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   ├── data
│   │   │   ├── migrations
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── tasks.py
│   │   │   ├── tests.py
│   │   │   ├── urls.py
│   │   │   ├── users
│   │   │   ├── validators.py
│   │   │   ├── views.py
│   │   │   └── views_plans.py
│   │   ├── create_superuser.py
│   │   ├── docker-compose.yml
│   │   ├── dump.rdb
│   │   ├── entrypoint.sh
│   │   ├── generated
│   │   │   ├── instance.tf
│   │   │   ├── key.tf
│   │   │   ├── mykey
│   │   │   ├── mykey.pub
│   │   │   ├── nacl.tf
│   │   │   ├── provider.tf
│   │   │   ├── securitygroup.tf
│   │   │   ├── subnet.tf
│   │   │   ├── vars.tf
│   │   │   └── vpc.tf
│   │   ├── manage.py
│   │   ├── provisioning
│   │   │   ├── templates
│   │   │   └── terraform_runner.py
│   │   ├── requirements.txt
│   │   ├── teg
│   │   │   ├── **init**.py
│   │   │   ├── asgi.py
│   │   │   ├── celery.py
│   │   │   ├── settings.py
│   │   │   ├── urls.py
│   │   │   └── wsgi.py
│   │   ├── terraform
│   │   │   ├── cloud
│   │   │   └── global
│   │   ├── terraform_with_modules
│   │   │   ├── cloud
│   │   │   └── global
│   │   ├── test_network.json
│   │   ├── test_network_ready.json
│   │   └── utils
│   │   └── terraform_commands.py
│   └── frontend
│   ├── README.md
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── public
│   │   ├── \_redirects
│   │   └── vite.svg
│   ├── requestuseregister.rest
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── assets
│   │   ├── components
│   │   ├── config
│   │   ├── constants.js
│   │   ├── contexts
│   │   ├── features
│   │   ├── firebase
│   │   ├── index.css
│   │   ├── lib
│   │   ├── main.jsx
│   │   ├── mocks
│   │   ├── pages
│   │   ├── services
│   │   ├── styles
│   │   ├── theme
│   │   └── utils
│   └── vite.config.js
├── case-01-single-vpc.json
├── cleanup_vpcs_extras.sh
├── destroy_vpcs.sh
├── documentacion.txt
├── estructura.md
├── infra
│   ├── bootstrap
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   └── versions.tf
│   └── terraform
│   ├── README.md
│   ├── alb.tf
│   ├── backend.tf
│   ├── ecr.tf
│   ├── ecs.tf
│   ├── iam_github_oidc.tf
│   ├── iam_task_role.tf
│   ├── outputs.tf
│   ├── providers.tf
│   ├── rds.tf
│   ├── redis.tf
│   ├── s3.tf
│   ├── secrets.tf
│   ├── security_groups.tf
│   ├── services.tf
│   ├── tasks.tf
│   ├── tf.plan
│   ├── tfplan
│   ├── var.database_url_secret_arn
│   ├── variables.tf
│   ├── versions.tf
│   └── vpc.tf
├── multi-tgw-demo.json
├── payload.apply.min.json
├── payload.min.json
├── plan.demo.json
├── plan_demo.json
├── scripts
│   ├── aws-control.sh
│   ├── set_backend_url.sh
│   └── test_celery.sh
├── tesis_vlan_deployment.md
├── testsdeploy.json
├── tools
│   └── docker
│   ├── backend.Dockerfile
│   ├── base.terraform.Dockerfile
│   ├── celery.Dockerfile
│   ├── compose.dev.yml
│   ├── flower.Dockerfile
│   └── frontend.Dockerfile
└── var.database_url_secret_arn

40 directories, 104 files
