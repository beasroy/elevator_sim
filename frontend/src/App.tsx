import { useSimulation } from './hooks/useSimulation';
import Building from './components/Building';
import ControlsPanel from './components/ControlsPanel';
import MetricsPanel from './components/MetricsPanel';
import RequestList from './components/RequestList';
import BiasesInfo from './components/BiasesInfo';

export default function App() {
  const { state, error, start, stop, reset, configure } = useSimulation();

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">
          {error ? `Error: ${error}` : 'Connecting to simulation...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Elevator Simulator</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {state.numElevators} elevators · {state.numFloors} floors ·{' '}
            {state.isRunning ? (
              <span className="text-emerald-400">Running</span>
            ) : (
              <span className="text-gray-500">Stopped</span>
            )}
          </p>
        </div>
        {error && (
          <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </header>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1400px] mx-auto">
        {/* Left sidebar: controls + metrics + biases */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <ControlsPanel
            isRunning={state.isRunning}
            speedMultiplier={state.speedMultiplier}
            requestFrequencyMs={state.requestFrequencyMs}
            numFloors={state.numFloors}
            numElevators={state.numElevators}
            onStart={start}
            onStop={stop}
            onReset={reset}
            onConfigure={configure}
          />
          <MetricsPanel
            metrics={state.metrics}
            simTimeMs={state.simTimeMs}
            totalRequests={state.requests.length}
          />
          <BiasesInfo />
        </aside>

        {/* Center: building visualization */}
        <main className="flex-1 min-h-[500px]">
          <Building
            elevators={state.elevators}
            requests={state.requests}
            numFloors={state.numFloors}
          />
        </main>

        {/* Right sidebar: request list */}
        <aside className="w-full lg:w-72 shrink-0 lg:h-[calc(100vh-6rem)] lg:sticky lg:top-4">
          <RequestList requests={state.requests} />
        </aside>
      </div>
    </div>
  );
}
