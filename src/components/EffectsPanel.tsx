import { useState } from "react";
import type { StacyCommand, LightType, CommandType, RGB, CommandParameters, CueType, ActionType, BeamMode } from "../types/stacypilot";
import type { JSX } from "react";

interface EffectsPanelProps {
  onAddCommand: (command: Omit<StacyCommand, "id">) => void;
  currentTime: number;
}

const LIGHT_TYPES: LightType[] = [
  "HeadsA", "HeadsB", "BarsA", "BarsB", 
  "LEDsA", "LEDsB", "LEDsC", 
  "StrobesA", "StrobesB", "WashesA", "WashesB"
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
  const [oddColor, setOddColor] = useState<RGB>({ r: 253, g: 110, b: 194 });
  const [evenColor, setEvenColor] = useState<RGB>({ r: 217, g: 0, b: 255 });
  const [colorsLinked, setColorsLinked] = useState(false);
  const [numberValue, setNumberValue] = useState(50);
  const [cueType, setCueType] = useState<CueType>("State.Cue1");
  const [actionType, setActionType] = useState<ActionType>("Cue6");
  const [beamMode, setBeamMode] = useState<BeamMode>("Beam");
  const [showPrestaging, setShowPrestaging] = useState(false);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  };

  const handleAddCommand = (commandType?: CommandType): void => {
    const commandToUse = commandType ?? selectedCommand;
    const parameters: CommandParameters = {
      lightType: selectedLightType,
    };

    // Add specific parameters based on command type
    switch (commandToUse) {
      case "Color":
        parameters.color = colorValue;
        break;
      case "Cue":
        parameters.cueType = cueType;
        parameters.cueValue = true;
        break;
      case "Action":
        parameters.actionType = actionType;
        parameters.actionValue = false;
        break;
      case "BeamMode":
        parameters.beamMode = beamMode;
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
      type: commandToUse,
      parameters,
    };

    onAddCommand(baseCommand);
  };

  const renderParameterControls = (): JSX.Element | null => {
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
              onChange={(e) => setCueType(e.target.value as CueType)}
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
              onChange={(e) => setActionType(e.target.value as ActionType)}
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
              onChange={(e) => setBeamMode(e.target.value as BeamMode)}
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
      <div className="p-4 space-y-4">
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
                  handleAddCommand(command);
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
        <div className="space-y-2">
          <button
            onClick={() => handleAddCommand()}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Command</span>
            </div>
            <div className="text-xs opacity-80 mt-1">
              @ {formatTime(currentTime)}
            </div>
          </button>
        </div>

        {/* Prestaging Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">Prestaging (Time = 0)</label>
            <button
              onClick={() => setShowPrestaging(!showPrestaging)}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors"
            >
              {showPrestaging ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showPrestaging && (
            <div className="space-y-3 p-3 bg-gray-800 rounded border border-purple-500">
              {/* Color Linking */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="colorLink"
                  checked={colorsLinked}
                  onChange={(e) => {
                    setColorsLinked(e.target.checked);
                    if (e.target.checked) {
                      setEvenColor(oddColor);
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="colorLink" className="text-sm text-gray-300">Link Odd/Even Colors</label>
              </div>
              
              {/* Odd Color Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-300">Odd Fixtures Color</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={oddColor.r}
                      onChange={(e) => {
                        const newColor = { ...oddColor, r: parseInt(e.target.value) || 0 };
                        setOddColor(newColor);
                        if (colorsLinked) setEvenColor(newColor);
                      }}
                      className="w-full px-1 py-1 bg-gray-700 text-white rounded text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={oddColor.g}
                      onChange={(e) => {
                        const newColor = { ...oddColor, g: parseInt(e.target.value) || 0 };
                        setOddColor(newColor);
                        if (colorsLinked) setEvenColor(newColor);
                      }}
                      className="w-full px-1 py-1 bg-gray-700 text-white rounded text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={oddColor.b}
                      onChange={(e) => {
                        const newColor = { ...oddColor, b: parseInt(e.target.value) || 0 };
                        setOddColor(newColor);
                        if (colorsLinked) setEvenColor(newColor);
                      }}
                      className="w-full px-1 py-1 bg-gray-700 text-white rounded text-xs"
                    />
                  </div>
                </div>
                <div
                  className="w-full h-4 rounded border border-gray-600"
                  style={{ backgroundColor: `rgb(${oddColor.r}, ${oddColor.g}, ${oddColor.b})` }}
                />
              </div>
              
              {/* Even Color Picker */}
              {!colorsLinked && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">Even Fixtures Color</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={evenColor.r}
                        onChange={(e) => setEvenColor(prev => ({ ...prev, r: parseInt(e.target.value) || 0 }))}
                        className="w-full px-1 py-1 bg-gray-700 text-white rounded text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={evenColor.g}
                        onChange={(e) => setEvenColor(prev => ({ ...prev, g: parseInt(e.target.value) || 0 }))}
                        className="w-full px-1 py-1 bg-gray-700 text-white rounded text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={evenColor.b}
                        onChange={(e) => setEvenColor(prev => ({ ...prev, b: parseInt(e.target.value) || 0 }))}
                        className="w-full px-1 py-1 bg-gray-700 text-white rounded text-xs"
                      />
                    </div>
                  </div>
                  <div
                    className="w-full h-4 rounded border border-gray-600"
                    style={{ backgroundColor: `rgb(${evenColor.r}, ${evenColor.g}, ${evenColor.b})` }}
                  />
                </div>
              )}
              
              {/* Generate Prestaging Button */}
              <button
                onClick={() => {
                  // Generate prestaging commands for all fixture types
                  const fixtureTypes: LightType[] = ["HeadsA", "HeadsB", "BarsA", "BarsB", "LEDsA", "LEDsB", "WashesA"];
                  
                  fixtureTypes.forEach(lightType => {
                    // Add odd color
                    onAddCommand({
                      time: 0,
                      type: "Color",
                      parameters: {
                        lightType,
                        color: oddColor,
                        colorDirection: "Odd"
                      }
                    });
                    
                    // Add even color
                    onAddCommand({
                      time: 0,
                      type: "Color",
                      parameters: {
                        lightType,
                        color: colorsLinked ? oddColor : evenColor,
                        colorDirection: "Even"
                      }
                    });
                  });
                  
                  // Add position presets
                  onAddCommand({
                    time: 0,
                    type: "Cue",
                    parameters: {
                      lightType: "HeadsA",
                      cueType: "Position.RandomCircle",
                      cueValue: true
                    }
                  });
                  
                  onAddCommand({
                    time: 0,
                    type: "Cue",
                    parameters: {
                      lightType: "HeadsB",
                      cueType: "Position.RandomCircle",
                      cueValue: true
                    }
                  });
                  
                  onAddCommand({
                    time: 0,
                    type: "Cue",
                    parameters: {
                      lightType: "BarsA",
                      cueType: "Position.RandomTilt",
                      cueValue: true
                    }
                  });
                  
                  onAddCommand({
                    time: 0,
                    type: "Cue",
                    parameters: {
                      lightType: "BarsB",
                      cueType: "Position.RandomTilt",
                      cueValue: true
                    }
                  });
                  
                  // Reset tilt for washes
                  onAddCommand({
                    time: 0,
                    type: "Tilt",
                    parameters: {
                      lightType: "WashesA",
                      tilt: 0
                    }
                  });
                  
                  onAddCommand({
                    time: 0,
                    type: "Tilt",
                    parameters: {
                      lightType: "WashesA",
                      tilt: 0
                    }
                  });
                }}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
              >
                Generate Prestaging @ Time 0
              </button>
            </div>
          )}
        </div>

        {/* Scalable Command Blocks */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Scalable Command Blocks</label>
          
          {/* Random Effects for Selected Light Type */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-400">Random Effects ({selectedLightType})</h4>
            <div className="grid grid-cols-1 gap-1">
              {["Random", "FadeRandom", "OldRandom", "BumpRandom", "Strobe", "Position.RandomCircle", "Position.RandomTilt", "Position.Circle", "Position.Tilt", "Position.SmoothTilt", "Position.SlowTilt", "Position.Pan", "Position.RandomPan", "Position.SmoothPan", "Position.SlowPan"].map((effect) => (
                <div key={effect} className="flex gap-1">
                  <button
                    onClick={() => {
                      onAddCommand({
                        time: currentTime,
                        type: "Cue",
                        parameters: {
                          lightType: selectedLightType,
                          cueType: effect as CueType,
                          cueValue: true
                        }
                      });
                    }}
                    className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    {effect} ON
                  </button>
                  <button
                    onClick={() => {
                      onAddCommand({
                        time: currentTime,
                        type: "Cue",
                        parameters: {
                          lightType: selectedLightType,
                          cueType: effect as CueType,
                          cueValue: false
                        }
                      });
                    }}
                    className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    {effect} OFF
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Scalable Effects for Both HeadsA/B */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-400">Scalable Effects (Both HeadsA/B)</h4>
            <div className="grid grid-cols-1 gap-1">
              {["Random", "FadeRandom", "OldRandom", "BumpRandom", "Strobe", "Position.RandomCircle", "Position.RandomTilt", "Position.Circle", "Position.Tilt", "Position.SmoothTilt", "Position.SlowTilt", "Position.Pan", "Position.RandomPan", "Position.SmoothPan", "Position.SlowPan"].map((effect) => (
                <div key={effect} className="flex gap-1">
                  <button
                    onClick={() => {
                      ["HeadsA", "HeadsB"].forEach(lightType => {
                        onAddCommand({
                          time: currentTime,
                          type: "Cue",
                          parameters: {
                            lightType: lightType as LightType,
                            cueType: effect as CueType,
                            cueValue: true
                          }
                        });
                      });
                    }}
                    className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    Both {effect} ON
                  </button>
                  <button
                    onClick={() => {
                      ["HeadsA", "HeadsB"].forEach(lightType => {
                        onAddCommand({
                          time: currentTime,
                          type: "Cue",
                          parameters: {
                            lightType: lightType as LightType,
                            cueType: effect as CueType,
                            cueValue: false
                          }
                        });
                      });
                    }}
                    className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    Both {effect} OFF
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Flash Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-400">Flash Actions (HeadsA/B)</h4>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  ["HeadsA", "HeadsB"].forEach(lightType => {
                    onAddCommand({
                      time: currentTime,
                      type: "Action",
                      parameters: {
                        lightType: lightType as LightType,
                        actionType: "Flash",
                        actionValue: false
                      }
                    });
                  });
                }}
                className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium transition-colors"
              >
                Flash Both
              </button>
            </div>
          </div>
        </div>

        {/* Quick Cue Actions */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Quick Cue Actions</label>
          <div className="grid grid-cols-2 gap-2">
            {["State.Cue1", "State.Cue2", "State.Cue3", "State.Cue4", "State.Cue5", "State.Cue6"].map((cue) => (
              <div key={cue} className="flex gap-1">
                <button
                  onClick={() => {
                    onAddCommand({
                      time: currentTime,
                      type: "Cue",
                      parameters: {
                        lightType: selectedLightType,
                        cueType: cue as CueType,
                        cueValue: true
                      }
                    });
                  }}
                  className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
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
                        cueType: cue as CueType,
                        cueValue: false
                      }
                    });
                  }}
                  className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                >
                  {cue.split('.')[1]} OFF
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Color Picker */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Enhanced Color Picker</label>
          
          {/* HTML Color Picker */}
          <div className="space-y-2">
            <input
              type="color"
              value={`#${colorValue.r.toString(16).padStart(2, '0')}${colorValue.g.toString(16).padStart(2, '0')}${colorValue.b.toString(16).padStart(2, '0')}`}
              onChange={(e) => {
                const hex = e.target.value;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                setColorValue({ r, g, b });
              }}
              className="w-full h-10 rounded border border-gray-600 bg-gray-700"
            />
            
            <button
              onClick={() => {
                onAddCommand({
                  time: currentTime,
                  type: "Color",
                  parameters: {
                    lightType: selectedLightType,
                    color: colorValue
                  }
                });
              }}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Apply Color
            </button>
          </div>
          
          {/* Quick Colors */}
          <div className="grid grid-cols-3 gap-2">
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
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors shadow-sm"
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
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors shadow-sm"
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
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors shadow-sm"
            >
              Blue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}