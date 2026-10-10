package policy

default allow = false

allow {
  input.method == "GET"
}

allow {
  input.path == "/health"
}
