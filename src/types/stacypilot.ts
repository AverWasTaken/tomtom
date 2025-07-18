// Light types supported by StacyPilot
export type LightType = 
  | "HeadsA" | "HeadsB" 
  | "BarsA" | "BarsB" 
  | "LEDsA" | "LEDsB" | "LEDsC" 
  | "StrobesA" | "StrobesB" 
  | "WashesA";

// Command types
export type CommandType = 
  | "On" | "Off" | "FadeOn" | "FadeOff"
  | "Cue" | "Action"
  | "BeamMode" | "BeamThickness" | "GoboSpread"
  | "Tilt" | "Pan" | "MotorSpeed"
  | "RotateGobo" | "Follow" | "StopFollowing"
  | "Color" | "SmoothColor" | "AnimatedGradients"
  | "SetGlobalCueSetting" | "SetCueSetting" | "LoopCues"
  | "CueSpeed" | "FadeSpeed" | "Dimness"
  | "Reset" | "HardReset";

// Color types
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorSequenceKeypoint {
  position: number;
  color: RGB;
}

export interface ColorSequence {
  keypoints: ColorSequenceKeypoint[];
}

// Beam modes
export type BeamMode = "Gobo" | "Beam" | "NoBeam";

// Cue types
export type CueType = 
  | "Random" | "FadeRandom" | "OldRandom" | "BumpRandom" | "Strobe"
  | "State.Cue1" | "State.Cue2" | "State.Cue3" | "State.Cue4" | "State.Cue5" | "State.Cue6"
  | "State.Cue7" | "State.Cue8" | "State.Cue9" | "State.Cue10" | "State.Cue11" | "State.Cue12"
  | "Color.ColorCue1" | "Color.ColorCue2" | "Color.ColorCue3"
  | "Position.Tilt" | "Position.Pan" | "Position.RandomCircle" | "Position.RandomTilt";

// Action types
export type ActionType = 
  | "Flash"
  | "Cue1" | "Cue2" | "Cue3" | "Cue4" | "Cue5" | "Cue6" | "Cue7" | "Cue8" | "Cue9" | "Cue10" | "Cue11" | "Cue12"
  | "CustomPositions.In" | "CustomPositions.Out";

// Global cue settings
export type GlobalCueSetting = 
  | "SecondaryColor"
  | "GroupRandom"
  | "Overshoot";

// Command parameter types
export type CommandParameters = {
  // Basic controls
  lightType: LightType;
  
  // Cue parameters
  cueType?: CueType;
  cueValue?: boolean;
  
  // Action parameters
  actionType?: ActionType;
  actionValue?: boolean;
  
  // Beam parameters
  beamMode?: BeamMode;
  beamThickness?: number;
  goboSpread?: number;
  
  // Position parameters
  tilt?: number;
  pan?: number;
  motorSpeed?: number;
  
  // Rotation parameters
  rotateGobo?: {
    speed: number;
    direction: "Odd" | "Even";
  };
  
  // Follow parameters
  followTarget?: string;
  
  // Color parameters
  color?: RGB | ColorSequence;
  colorDirection?: "Odd" | "Even";
  smoothColor?: boolean;
  animatedGradients?: boolean;
  
  // Global settings
  globalCueSetting?: {
    setting: GlobalCueSetting;
    value: RGB | boolean;
  };
  
  // Local settings
  localCueSetting?: {
    cue: string;
    setting: string;
    value: number | boolean;
  };
  
  // Speed and fade
  cueSpeed?: number;
  fadeSpeed?: number;
  dimness?: number;
  
  // Other
  loopCues?: boolean;
};

// Main StacyPilot command structure
export interface StacyCommand {
  id: string;
  time: number;
  type: CommandType;
  parameters: CommandParameters;
  // Optional display properties
  label?: string;
  color?: string;
}

// Timeline project structure
export interface TimelineProject {
  name: string;
  audioFile: File | null;
  commands: StacyCommand[];
  duration: number;
  // Optional metadata
  bpm?: number;
  timeSignature?: [number, number];
  notes?: string;
}

// Export format for StacyPilot scripts
export interface StacyScriptLine {
  Time: number;
  Data: (string | number | boolean | RGB | ColorSequence)[];
}

export type StacyScript = StacyScriptLine[]; 