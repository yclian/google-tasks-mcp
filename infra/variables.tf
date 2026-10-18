variable "project_id" {
  description = "GCP project to deploy into."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run, Artifact Registry and the KMS key ring."
  type        = string
}

variable "firestore_location" {
  description = "Firestore location. Defaults to the region."
  type        = string
  default     = null
}

variable "service_name" {
  description = "Cloud Run service name; also prefixes other resources."
  type        = string
  default     = "google-tasks-mcp"
}

variable "issuer_url" {
  description = "Public base URL of the server, e.g. https://<host>. Pins the OAuth issuer and Google redirect URI."
  type        = string
}

variable "allowed_domain" {
  description = "Google Workspace domain allowed to sign in. Empty allows any Google account."
  type        = string
  default     = ""
}

variable "allowed_redirect_uris" {
  description = "OAuth redirect URIs clients may register: exact https URIs, or \"loopback\" for local clients (Claude Code, mcp-remote). Stops a crafted login link from sending a user's code to another site."
  type        = list(string)
  default     = ["loopback", "https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"]
}

variable "custom_domain" {
  description = "Hostname to map to the service (requires a verified domain)."
  type        = string
  default     = ""
}

variable "enable_custom_domain" {
  description = "Create the Cloud Run domain mapping for custom_domain."
  type        = bool
  default     = false
}

variable "image" {
  description = "Initial container image. Later images are deployed with gcloud and ignored by Terraform."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "max_instances" {
  description = "Cloud Run maximum instances."
  type        = number
  default     = 3
}
