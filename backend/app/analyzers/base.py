from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseAnalyzer(ABC):
    """Abstract base class for all BlindSpot analyzers."""

    @abstractmethod
    def analyze(self, data: Any, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Runs analysis and returns a list of finding dictionaries.
        Each finding MUST contain evidence items conforming to the Evidence schema.
        """
        pass
