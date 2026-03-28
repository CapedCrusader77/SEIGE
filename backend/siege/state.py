class SimulationState:
    def __init__(self) -> None:
        self.is_attack_in_progress = False
        self.firewall_enabled = False
        self.ids_enabled = False


state = SimulationState()
