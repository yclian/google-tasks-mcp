# Characterisation goldens (phase 0)

**Characterisation, not certification.** These files record what upstream did
before the GCP-deployment changes, including its bugs. They guard refactors
against unintended change. They do not say the behaviour is correct.

Each golden is deleted when the scenario that certifies the same behaviour lands:

| Golden | Deleted by |
|--------|------------|
| `<tool>_ok`, `<tool>_google_error` (28) | Task 8 tool scenarios |
| `as_metadata` | Task 9 `discovery_documents` |
| `token_response` | Task 10 `full_login` |
| `initialize`, `tools_list` | Task 6 `tools_list_has_14` / transport scenarios |

Known upstream defect captured here: `delete_task_ok`, `delete_task_list_ok` and
`clear_completed_tasks_ok` report `Unexpected end of JSON input` because Google's
204 has no body. Fixed in Task 8.
