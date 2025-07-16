import { useState } from "react";
import type { StacyCommand, LightType, CommandType, RGB } from "../types/stacypilot";

interface EffectsPanelProps {
  onAddCommand: (command: Omit<StacyCommand, "id">) => void;
  currentTime: number;
}

const LIGHT_TYPES: LightType[] = [
  "HeadsA", "HeadsB", "BarsA", "BarsB", 
  "LEDsA", "LEDsB", "LEDsC", 
  "StrobesA", "StrobesB", "WashesA"
];

const BASIC_COMMANDS: CommandType[] = [
  "On", "Off", "FadeOn", "FadeOff", "Reset", "HardReset"
];

const EFFECT_COMMANDS: CommandType[] = [
  "Color", "Cue", "Action", "BeamMode", "BeamThickness", "Tilt", "Pan", "Dimness"
];

export function EffectsPanel({ onAddCommand, currentTime }: EffectsPanelProps) {
  const [selectedLightType, setSelectedLightType] = useState<LightType>("HeadsA");
  const [selectedCommand, setSelectedCommand] = useState<CommandType>("On");
  const [colorValue, setColorValue] = useState<RGB>({ r: 255, g: 255, b: 255 });
  const [numberValue, setNumberValue] = useState(50);
  const [cueType, setCueType] = useState("State.Cue1");
  const [actionType, setActionType] = useState("Cue6");
  const [beamMode, setBeamMode] = useState("Beam");

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  };

  const handleAddCommand = () => {
    let parameters: any = {
      lightType: selectedLightType,
    };

    // Add specific parameters based on command type
    switch (selectedCommand) {
      case "Color":
        parameters.color = colorValue;
        break;
      case "Cue":
        parameters.cueType = cueType as any;
        parameters.cueValue = true;
        break;
      case "Action":
        parameters.actionType = actionType as any;
        parameters.actionValue = false;
        break;
      case "BeamMode":
        parameters.beamMode = beamMode as any;
        break;
      case "BeamThickness":
        parameters.beamThickness = numberValue;
        break;
      case "Tilt":
        parameters.tilt = numberValue;
        break;
      case "Pan":
        parameters.pan = numberValue;
        break;
      case "Dimness":
        parameters.dimness = numberValue / 100;
        break;
    }

    const baseCommand = {
      time: currentTime,
      type: selectedCommand,
      parameters,
    };

    onAddCommand(baseCommand);
  };

  const renderParameterControls = () => {
    switch (selectedCommand) {
      case "Color":
        return (
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
                  onChange={(e) => setColorValue(prev => ({ ...prev, r: parseInt(e.target.value) || 0 }))}
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
                  onChange={(e) => setColorValue(prev => ({ ...prev, g: parseInt(e.target.value) || 0 }))}
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
                  onChange={(e) => setColorValue(prev => ({ ...prev, b: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
              </div>
            </div>
            <div
              className="w-full h-8 rounded border border-gray-600"
              style={{ backgroundColor: `rgb(${colorValue.r}, ${colorValue.g}, ${colorValue.b})` }}
            />
          </div>
        );

      case "Cue":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Cue Type</label>
            <select
              value={cueType}
              onChange={(e) => setCueType(e.target.value)}
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
        );

      case "Action":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Action Type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
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
        );

      case "BeamMode":
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Beam Mode</label>
            <select
              value={beamMode}
              onChange={(e) => setBeamMode(e.target.value)}
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
              onChange={(e) => setNumberValue(parseInt(e.target.value))}
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
              onChange={(e) => setNumberValue(parseInt(e.target.value))}
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
              onChange={(e) => setNumberValue(parseInt(e.target.value))}
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
              onChange={(e) => setNumberValue(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6">
        {/* Current Time Display */}
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-300">Current Time</div>
          <div className="text-lg font-mono text-white">{formatTime(currentTime)}</div>
        </div>

        {/* Light Type Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Light Type</label>
          <select
            value={selectedLightType}
            onChange={(e) => setSelectedLightType(e.target.value as LightType)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded"
          >
            {LIGHT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Basic Commands */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Basic Commands</label>
          <div className="grid grid-cols-2 gap-2">
            {BASIC_COMMANDS.map((command) => (
              <button
                key={command}
                onClick={() => {
                  setSelectedCommand(command);
                  handleAddCommand();
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                {command}
              </button>
            ))}
          </div>
        </div>

        {/* Effect Commands */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Effect Commands</label>
          <select
            value={selectedCommand}
            onChange={(e) => setSelectedCommand(e.target.value as CommandType)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded"
          >
            {EFFECT_COMMANDS.map((command) => (
              <option key={command} value={command}>
                {command}
              </option>
            ))}
          </select>
        </div>

        {/* Parameter Controls */}
        {renderParameterControls()}

        {/* Add Command Button */}
        <button
          onClick={handleAddCommand}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
        >
          Add Command at {formatTime(currentTime)}
        </button>

        {/* Quick Actions */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Quick Cue Actions</label>
          <div className="grid grid-cols-2 gap-1">
            {["State.Cue1", "State.Cue2", "State.Cue3", "State.Cue4", "State.Cue5", "State.Cue6"].map((cue) => (
              <div key={cue} className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    onAddCommand({
                      time: currentTime,
                      type: "Cue",
                      parameters: {
                        lightType: selectedLightType,
                        cueType: cue as any,
                        cueValue: true
                      }
                    });
                  }}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                >
                  {cue.split('.')[1]} ON
                </button>
                <button
                  onClick={() => {
                    onAddCommand({
                      time: currentTime,
                      type: "Cue",
                      parameters: {
                        lightType: selectedLightType,
                        cueType: cue as any,
                        cueValue: false
                      }
                    });
                  }}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                >
                  {cue.split('.')[1]} OFF
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Color Quick Actions */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Quick Colors</label>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => {
                onAddCommand({
                  time: currentTime,
                  type: "Color",
                  parameters: {
                    lightType: selectedLightType,
                    color: { r: 255, g: 0, b: 0 }
                  }
                });
              }}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
            >
              Red
            </button>
            <button
              onClick={() => {
                onAddCommand({
                  time: currentTime,
                  type: "Color",
                  parameters: {
                    lightType: selectedLightType,
                    color: { r: 0, g: 255, b: 0 }
                  }
                });
              }}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
            >
              Green
            </button>
            <button
              onClick={() => {
                onAddCommand({
                  time: currentTime,
                  type: "Color",
                  parameters: {
                    lightType: selectedLightType,
                    color: { r: 0, g: 0, b: 255 }
                  }
                });
              }}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            >
              Blue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 