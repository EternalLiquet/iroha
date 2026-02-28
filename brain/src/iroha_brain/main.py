from fastapi import FastAPI

from iroha_brain.api import router
from iroha_brain.core.config import settings
from iroha_brain.core.logging import configure_logging

configure_logging(settings.log_level)

app = FastAPI(title="iroha-brain", version="0.0.1")
app.include_router(router)
