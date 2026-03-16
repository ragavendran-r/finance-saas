from abc import ABC, abstractmethod
from typing import Any, Dict


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system: str, user: str) -> str:
        """Send a prompt and return the raw text response from the model."""
        ...

    async def complete_json(self, system: str, user: str) -> Dict[str, Any]:
        """Optional helper for providers that can directly return JSON."""
        # Default implementation just calls complete(); callers can parse as needed.
        from json import loads

        raw = await self.complete(system, user)
        return loads(raw)
