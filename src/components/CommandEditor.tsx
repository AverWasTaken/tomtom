import { useState, useEffect } from "react";
import type { StacyCommand, RGB, CommandParameters, CueType, ActionType, BeamMode } from "../types/stacypilot";

interface CommandEditorProps {
  command: StacyCommand;
  onUpdate: (updates: Partial<StacyCommand>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function CommandEditor({ command, onUpdate, onDelete, onClose }: CommandEditorProps) {
  const [time, setTime] = useState(command.time);
  const [colorValue, setColorValue] = useState<RGB>({ r: 255, g: 255, b: 255 });
  const [numberValue, setNumberValue] = useState(50);
  const [cueType, setCueType] = useState("State.Cue1");
  const [actionType, setActionType] = useState("Cue6");
  const [beamMode, setBeamMode] = useState("Beam");

  // Initialize values from command
  useEffect(() => {
    setTime(command.time);
    
    if (command.parameters.color && typeof command.parameters.color === "object" && "r" in command.parameters.color) {
      setColorValue(command.parameters.color);
    }
    
    if (command.parameters.beamThickness !== undefined) {
      setNumberValue(command.parameters.beamThickness);
    } else if (command.parameters.tilt !== undefined) {
      setNumberValue(command.parameters.tilt);
    } else if (command.parameters.pan !== undefined) {
      setNumberValue(command.parameters.pan);
    } else if (command.parameters.dimness !== undefined) {
      setNumberValue(command.parameters.dimness * 100);
    }
    
    if (command.parameters.cueType) {
      setCueType(command.parameters.cueType as string);
    }
    
    if (command.parameters.actionType) {
      setActionType(command.parameters.actionType as string);
    }
    
    if (command.parameters.beamMode) {
      setBeamMode(command.parameters.beamMode as string);
    }
  }, [command]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  };

  const handleTimeChange = (newTime: number) => {
    setTime(newTime);
    onUpdate({ time: newTime });
  };

  const handleParameterUpdate = (parameterUpdates: Partial<CommandParameters>) => {
    onUpdate({
      parameters: {
        ...command.parameters,
        ...parameterUpdates,
      },
    });
  };

  const renderParameterEditor = () => {
    switch (command.type) {
      case "Color":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Color</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-400">R</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={colorValue.r}
                    onChange={(e) => {
                      const newColor = { ...colorValue, r: parseInt(e.target.value) || 0 };
                      setColorValue(newColor);
                      handleParameterUpdate({ color: newColor });
                    }}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400">G</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={colorValue.g}
                    onChange={(e) => {
                      const newColor = { ...colorValue, g: parseInt(e.target.value) || 0 };
                      setColorValue(newColor);
                      handleParameterUpdate({ color: newColor });
                    }}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400">B</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={colorValue.b}
                    onChange={(e) => {
                      const newColor = { ...colorValue, b: parseInt(e.target.value) || 0 };
                      setColorValue(newColor);
                      handleParameterUpdate({ color: newColor });
                    }}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                  />
                </div>
              </div>
              <div
                className="w-full h-12 rounded border border-gray-600"
                style={{ backgroundColor: `rgb(${colorValue.r}, ${colorValue.g}, ${colorValue.b})` }}
              />
            </div>
          </div>
        );

      case "Cue":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Cue Type</label>
              <select
                value={cueType}
                onChange={(e) => {
                  const value = e.target.value as CueType;
                  setCueType(value);
                  handleParameterUpdate({ cueType: value });
                }}
                className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              >
                               <option value="Random">Random</option>
               <option value="State.Cue1">State Cue 1</option>
               <option value="State.Cue2">State Cue 2</option>
               <option value="State.Cue3">State Cue 3</option>
               <option value="State.Cue4">State Cue 4</option>
               <option value="State.Cue5">State Cue 5</option>
               <option value="State.Cue6">State Cue 6</option>
               <option value="State.Cue7">State Cue 7</option>
               <option value="State.Cue8">State Cue 8</option>
               <option value="State.Cue9">State Cue 9</option>
               <option value="State.Cue10">State Cue 10</option>
               <option value="State.Cue11">State Cue 11</option>
               <option value="State.Cue12">State Cue 12</option>
               <option value="Color.ColorCue1">Color Cue 1</option>
               <option value="Color.ColorCue2">Color Cue 2</option>
               <option value="Color.ColorCue3">Color Cue 3</option>
               <option value="Position.Tilt">Position Tilt</option>
               <option value="Position.Pan">Position Pan</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Cue State</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleParameterUpdate({ cueValue: true })}
                  className={`px-3 py-1 rounded text-sm ${
                    command.parameters.cueValue
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  On
                </button>
                <button
                  onClick={() => handleParameterUpdate({ cueValue: false })}
                  className={`px-3 py-1 rounded text-sm ${
                    !command.parameters.cueValue
                      ? "bg-red-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  Off
                </button>
              </div>
            </div>
          </div>
                 );

      case "Action":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => {
                  const value = e.target.value as ActionType;
                  setActionType(value);
                  handleParameterUpdate({ actionType: value });
                }}
                className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              >
                <option value="Flash">Flash</option>
                <option value="Cue1">Cue 1</option>
                <option value="Cue2">Cue 2</option>
                <option value="Cue3">Cue 3</option>
                <option value="Cue4">Cue 4</option>
                <option value="Cue5">Cue 5</option>
                <option value="Cue6">Cue 6</option>
                <option value="Cue7">Cue 7</option>
                <option value="Cue8">Cue 8</option>
                <option value="Cue9">Cue 9</option>
                <option value="Cue10">Cue 10</option>
                <option value="Cue11">Cue 11</option>
                <option value="Cue12">Cue 12</option>
                <option value="CustomPositions.In">Custom Positions In</option>
                <option value="CustomPositions.Out">Custom Positions Out</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Action Value</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleParameterUpdate({ actionValue: true })}
                  className={`px-3 py-1 rounded text-sm ${
                    command.parameters.actionValue
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  True
                </button>
                <button
                  onClick={() => handleParameterUpdate({ actionValue: false })}
                  className={`px-3 py-1 rounded text-sm ${
                    !command.parameters.actionValue
                      ? "bg-red-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  False
                </button>
              </div>
            </div>
          </div>
        );

      case "BeamMode":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Beam Mode</label>
            <select
              value={beamMode}
              onChange={(e) => {
                const value = e.target.value as BeamMode;
                setBeamMode(value);
                handleParameterUpdate({ beamMode: value });
              }}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
            >
              <option value="Gobo">Gobo</option>
              <option value="Beam">Beam</option>
              <option value="NoBeam">No Beam</option>
            </select>
          </div>
        );

      case "BeamThickness":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Beam Thickness: {numberValue}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={numberValue}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setNumberValue(value);
                handleParameterUpdate({ beamThickness: value });
              }}
              className="w-full"
            />
          </div>
        );

      case "Tilt":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Tilt: {numberValue}°
            </label>
            <input
              type="range"
              min="-90"
              max="90"
              value={numberValue}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setNumberValue(value);
                handleParameterUpdate({ tilt: value });
              }}
              className="w-full"
            />
          </div>
        );

      case "Pan":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Pan: {numberValue}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={numberValue}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setNumberValue(value);
                handleParameterUpdate({ pan: value });
              }}
              className="w-full"
            />
          </div>
        );

      case "Dimness":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Dimness: {numberValue}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={numberValue}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setNumberValue(value);
                handleParameterUpdate({ dimness: value / 100 });
              }}
              className="w-full"
            />
          </div>
        );

      default:
        return (
          <div className="text-gray-400 text-sm">
            No additional parameters for this command type.
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Edit Command</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Command Info */}
        <div className="space-y-3">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-sm text-gray-300">Command Type</div>
            <div className="text-lg font-medium text-white">{command.type}</div>
          </div>
          
          <div className="bg-gray-700 rounded p-3">
            <div className="text-sm text-gray-300">Light Type</div>
            <div className="text-lg font-medium text-white">{command.parameters.lightType}</div>
          </div>
        </div>

        {/* Time Editor */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Time</label>
          <div className="space-y-2">
            <input
              type="number"
              step="0.01"
              value={time}
              onChange={(e) => handleTimeChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
            <div className="text-xs text-gray-400">
              Current: {formatTime(time)}
            </div>
          </div>
        </div>

        {/* Parameter Editor */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Parameters</label>
          {renderParameterEditor()}
        </div>

        {/* Command Preview */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">StacyPilot Output</label>
          <div className="bg-gray-800 rounded p-3 text-xs font-mono text-green-400 overflow-auto">
            {`{Time = ${command.time.toFixed(3)}, Data = {"${command.parameters.lightType}"; "${command.type}"`}
            {command.type === "Color" && command.parameters.color && typeof command.parameters.color === "object" && "r" in command.parameters.color && 
              `; Color3.fromRGB(${command.parameters.color.r}, ${command.parameters.color.g}, ${command.parameters.color.b})`}
            {command.type === "Cue" && `; "${command.parameters.cueType}"; ${command.parameters.cueValue}`}
            {command.type === "Action" && `; "${command.parameters.actionType}"; ${command.parameters.actionValue}`}
            {command.type === "BeamMode" && `; "${command.parameters.beamMode}"`}
            {command.type === "BeamThickness" && `; ${command.parameters.beamThickness}`}
            {command.type === "Tilt" && `; ${command.parameters.tilt}`}
            {command.type === "Pan" && `; ${command.parameters.pan}`}
            {command.type === "Dimness" && `; ${command.parameters.dimness}`}
            {"}"};
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onDelete}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
          >
            Delete Command
          </button>
        </div>
      </div>
    </div>
  );
} 