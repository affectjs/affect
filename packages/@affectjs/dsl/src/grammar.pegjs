/**
 * Fluent-FFmpeg DSL Grammar
 * 
 * A PEG grammar for parsing fluent-ffmpeg DSL configuration files
 */

{
  const buildAST = (type, props = {}) => ({ type, ...props });
}

Start
  = _ block:(ConvertBlock / CommandsList) _ { return block; } 

CommandsList
  = commands:Command* { return { type: 'Program', commands }; }

ConvertBlock
  = "affect" _ type:MediaType _ input:InputValue _ output:OutputValue? _ "{" _ commands:Command* _ "}" _ {
      const allCommands = [
        { type: 'Input', path: input },
        ...commands
      ];
      if (output) {
        allCommands.push({ type: 'Save', path: output });
      }
      return { type: 'AffectBlock', mediaType: type, commands: allCommands };
    }
  / "affect" _ type:MediaType _ input:InputValue _ "{" _ commands:Command* _ "}" _ {
      const allCommands = [
        { type: 'Input', path: input },
        ...commands
      ];
      return { type: 'AffectBlock', mediaType: type, commands: allCommands };
    }
  / "convert" _ input:StringLiteral _ "{" _ commands:Command* _ "}" _ output:OutputCommand? _ {
      const allCommands = [
        { type: 'Input', path: input },
        ...commands,
        ...(output ? [output] : [])
      ];
      return { type: 'ConvertBlock', commands: allCommands };
    }

InputValue
  = v:Variable { return v; }
  / s:StringLiteral { return { type: 'Literal', value: s }; }

OutputValue
  = v:Variable { return v; }
  / s:StringLiteral { return { type: 'Literal', value: s }; }

Variable
  = "$" name:Identifier { return { type: 'Variable', name: name }; }

MediaType
  = "auto" { return "auto"; }
  / "video" { return "video"; }
  / "audio" { return "audio"; }
  / "image" { return "image"; }

Command
  = IfBlock
  / VideoBlock
  / AudioBlock
  / FilterBlock
  / UnifiedCommand
  / InputCommand
  / VideoCommand
  / AudioCommand
  / OutputCommand
  / OptionCommand
  / EventCommand

// Grouped commands (video {}, audio {}, filter {})
VideoBlock
  = "video" _ "{" _ commands:VideoBlockCommand* _ "}" _ {
      return buildAST('VideoBlock', { commands });
    }

VideoBlockCommand
  = VideoBlockCodec
  / VideoBlockBitrate
  / VideoBlockSize
  / VideoBlockFPS
  / VideoBlockFilter
  / NoVideo

VideoBlockCodec
  = "codec" _ codec:StringLiteral _ {
      return buildAST('VideoCodec', { codec: codec });
    }

VideoBlockBitrate
  = "bitrate" _ bitrate:(Number / StringLiteral) _ {
      return buildAST('VideoBitrate', { bitrate: bitrate });
    }

VideoBlockSize
  = "size" _ size:StringLiteral _ {
      return buildAST('VideoSize', { size });
    }

VideoBlockFPS
  = "fps" _ fps:Number _ {
      return buildAST('VideoFPS', { fps });
    }

VideoBlockFilter
  = "filter" _ filter:StringLiteral _ {
      return buildAST('VideoFilter', { filter });
    }
  / "filter" _ filter:FilterObject _ {
      return buildAST('VideoFilter', filter);
    }

AudioBlock
  = "audio" _ "{" _ commands:AudioBlockCommand* _ "}" _ {
      return buildAST('AudioBlock', { commands });
    }

AudioBlockCommand
  = AudioBlockCodec
  / AudioBlockBitrate
  / AudioBlockChannels
  / AudioBlockFrequency
  / NoAudio

AudioBlockCodec
  = "codec" _ codec:StringLiteral _ {
      return buildAST('AudioCodec', { codec: codec });
    }

AudioBlockBitrate
  = "bitrate" _ bitrate:(Number / StringLiteral) _ {
      return buildAST('AudioBitrate', { bitrate });
    }

AudioBlockChannels
  = "channels" _ channels:Number _ {
      return buildAST('AudioChannels', { channels });
    }

AudioBlockFrequency
  = "frequency" _ frequency:Number _ {
      return buildAST('AudioFrequency', { frequency });
    }

FilterBlock
  = "filter" _ "{" _ commands:FilterBlockCommand* _ "}" _ {
      return buildAST('FilterBlock', { commands });
    }

FilterBlockCommand
  = FilterBlockItem

FilterBlockItem
  = name:Identifier _ value:(Number / StringLiteral) _ {
      return buildAST('Filter', { name, value });
    }
  / name:Identifier _ &(Identifier / "}") {
      return buildAST('Filter', { name, value: null });
    }

// Conditional logic (if/else)
IfBlock
  = "if" _ condition:ConditionExpression _ "{" _ thenCommands:Command* _ "}" _ elseBlock:ElseBlock? _ {
      return buildAST('IfBlock', {
        condition,
        thenCommands,
        elseCommands: elseBlock ? elseBlock.commands : []
      });
    }

ElseBlock
  = "else" _ "{" _ commands:Command* _ "}" _ {
      return { commands };
    }

ConditionExpression
  = LogicalOrExpression

LogicalOrExpression
  = left:LogicalAndExpression _ "or" _ right:LogicalOrExpression {
      return { type: 'LogicalOr', left, right };
    }
  / LogicalAndExpression

LogicalAndExpression
  = left:ComparisonExpression _ "and" _ right:LogicalAndExpression {
      return { type: 'LogicalAnd', left, right };
    }
  / ComparisonExpression

ComparisonExpression
  = left:ValueExpression _ operator:ComparisonOperator _ right:ValueExpression {
      return { type: 'Comparison', left, operator, right };
    }
  / UnaryExpression

UnaryExpression
  = "not" _ expr:ValueExpression {
      return { type: 'UnaryNot', expr };
    }
  / ValueExpression

ValueExpression
  = PropertyAccess
  / Variable
  / StringLiteral
  / Number
  / Identifier

PropertyAccess
  = name:Identifier {
      return { type: 'Property', name };
    }

ComparisonOperator
  = ">=" { return ">="; }
  / "<=" { return "<="; }
  / "==" { return "=="; }
  / "!=" { return "!="; }
  / ">" { return ">"; }
  / "<" { return "<"; }

// Unified commands (work for video/audio/image)
UnifiedCommand
  = ResizeCommand
  / EncodeCommand
  / FilterCommand
  / CropCommand
  / RotateCommand

ResizeCommand
  = "resize" _ width:(Percentage / "auto" / Number) _ height:(Percentage / "auto" / Number)? _ {
      return buildAST('Resize', { width, height: height !== undefined ? height : null });
    }

Percentage
  = value:Number "%" { return value + "%"; }

EncodeCommand
  = "encode" _ codec:CodecName _ param:(Number / StringLiteral / Identifier)? _ {
      return buildAST('Encode', { codec, param: param || null });
    }

CodecName
  = chars:[a-zA-Z0-9_]+ { 
      return Array.isArray(chars) ? chars.join('') : String(chars); 
    }

FilterCommand
  = "filter" _ name:Identifier _ value:(Number / StringLiteral / Identifier)? _ {
      return buildAST('Filter', { name, value: value || null });
    }

CropCommand
  = "crop" _ x:(Number / "center") _ y:(Number / "auto")? _ width:Number _ height:Number _ {
      return buildAST('Crop', { x, y: y !== undefined ? y : null, width, height });
    }
  / "crop" _ region:StringLiteral _ width:Number _ height:Number _ {
      return buildAST('Crop', { region, width, height });
    }

RotateCommand
  = "rotate" _ angle:Number _ flip:StringLiteral? _ {
      return buildAST('Rotate', { angle, flip: flip || null });
    }

// Input commands
InputCommand
  = "input" _ path:StringLiteral _ { return buildAST('Input', { path: path }); }
  / "input" _ paths:StringList _ { return buildAST('Input', { paths }); }

StringList
  = "[" _ first:StringLiteral rest:("," _ StringLiteral)* _ "]" {
      return [first, ...rest.map(r => r[2])];
    }

// Video commands
VideoCommand
  = VideoCodec
  / VideoBitrate
  / VideoSize
  / VideoFPS
  / VideoFilter
  / NoVideo

VideoCodec
  = "video" _ "codec" _ codec:StringLiteral _ {
      return buildAST('VideoCodec', { codec: codec });
    }

VideoBitrate
  = "video" _ "bitrate" _ bitrate:(Number / StringLiteral) _ {
      return buildAST('VideoBitrate', { bitrate: bitrate });
    }

VideoSize
  = "video" _ "size" _ size:StringLiteral _ {
      return buildAST('VideoSize', { size });
    }

VideoFPS
  = "video" _ "fps" _ fps:Number _ {
      return buildAST('VideoFPS', { fps });
    }

VideoFilter
  = "video" _ "filter" _ filter:StringLiteral _ {
      return buildAST('VideoFilter', { filter });
    }
  / "video" _ "filter" _ filter:FilterObject _ {
      return buildAST('VideoFilter', filter);
    }

FilterObject
  = "{" _ "filter" _ ":" _ name:StringLiteral _ options:FilterOptions? _ "}" {
      return { filter: name, ...(options || {}) };
    }

FilterOptions
  = "," _ "options" _ ":" _ value:(StringLiteral / ObjectLiteral / ArrayLiteral) _ {
      return { options: value };
    }

NoVideo
  = "no" _ "video" _ { return buildAST('NoVideo'); }

// Audio commands
AudioCommand
  = AudioCodec
  / AudioBitrate
  / AudioChannels
  / AudioFrequency
  / NoAudio

AudioCodec
  = "audio" _ "codec" _ codec:StringLiteral _ {
      return buildAST('AudioCodec', { codec: codec });
    }

AudioBitrate
  = "audio" _ "bitrate" _ bitrate:(Number / StringLiteral) _ {
      return buildAST('AudioBitrate', { bitrate });
    }

AudioChannels
  = "audio" _ "channels" _ channels:Number _ {
      return buildAST('AudioChannels', { channels });
    }

AudioFrequency
  = "audio" _ "frequency" _ frequency:Number _ {
      return buildAST('AudioFrequency', { frequency });
    }

NoAudio
  = "no" _ "audio" _ { return buildAST('NoAudio'); }

// Output command (only save, output is deprecated)
OutputCommand
  = "save" _ path:StringLiteral _ {
      return buildAST('Save', { path });
    }

// Option commands
OptionCommand
  = "timeout" _ timeout:Number _ {
      return buildAST('Timeout', { timeout });
    }
  / "format" _ format:StringLiteral _ {
      return buildAST('Format', { format });
    }

// Event commands
EventCommand
  = "on" _ "start" _ handler:EventHandler _ {
      return buildAST('OnStart', { handler });
    }
  / "on" _ "end" _ handler:EventHandler _ {
      return buildAST('OnEnd', { handler });
    }
  / "on" _ "error" _ handler:EventHandler _ {
      return buildAST('OnError', { handler });
    }
  / "on" _ "progress" _ handler:EventHandler _ {
      return buildAST('OnProgress', { handler });
    }

EventHandler
  = StringLiteral
  / Identifier

// Literals
StringLiteral
  = '"' chars:DoubleStringChar* '"' { 
      return chars.map(c => String(c)).join(''); 
    }
  / "'" chars:SingleStringChar* "'" { 
      return chars.map(c => String(c)).join(''); 
    }

DoubleStringChar
  = !["\\] char:. { return String(char); }
  / "\\" sequence:EscapeSequence { return sequence; }

SingleStringChar
  = !['\\] char:. { return String(char); }
  / "\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
  = '"' { return '"'; }
  / "'" { return "'"; }
  / "\\" { return "\\"; }
  / "n" { return "\n"; }
  / "r" { return "\r"; }
  / "t" { return "\t"; }

Number
  = digits:[0-9]+ ("." [0-9]+)? { 
      const digitStr = Array.isArray(digits) ? digits.join('') : String(digits);
      return parseFloat(digitStr); 
    }

Identifier
  = first:[a-zA-Z_] rest:[a-zA-Z0-9_]* { 
      const allChars = [first, ...rest];
      return allChars.join(''); 
    }

ObjectLiteral
  = "{" _ pairs:KeyValuePair* _ "}" {
      const obj = {};
      pairs.forEach(pair => {
        obj[pair.key] = pair.value;
      });
      return obj;
    }

KeyValuePair
  = key:StringLiteral _ ":" _ value:(StringLiteral / Number / ObjectLiteral / ArrayLiteral) _ ","? _ {
      return { key, value };
    }

ArrayLiteral
  = "[" _ items:ArrayItem* _ "]" {
      return items;
    }

ArrayItem
  = item:(StringLiteral / Number / ObjectLiteral / ArrayLiteral) _ ","? _ { return item; }

// Whitespace
_ = [ \t\n\r]*

