import { MODELS } from '../config/models.js';

const CODING = ['code','program','function','class','script','implement','build',
  'debug','fix bug','test','api','component','module','import','export',
  'python','javascript','typescript','rust','go','java','html','css','sql','bash',
  'refactor','optimize','algorithm','react','node','express','flask','django',
  'código','función','implementa','programa','arregla','escribe el código','crea'];

const REASONING = ['math','calculate','solve','proof','equation','formula',
  'logic','step by step','prove','theorem','calculus','algebra','statistics',
  'matemáticas','calcula','resuelve','ecuación','demuestra','razona'];

const CREATIVE = ['write a story','poem','creative writing','narrative','fiction',
  'blog post','essay','marketing copy','slogan','advertisement','describe vividly',
  'poema','historia','narrativa','ficción','redacta','artículo de blog'];

const SPEED = ['quick','summarize','tldr','briefly','short answer','classify',
  'categorize','yes or no','one word','rápido','resumir','resumen breve',
  'en pocas palabras','clasifica','sí o no'];

function count(text, kws) {
  const l = text.toLowerCase();
  return kws.filter(k => l.includes(k)).length;
}

export function routeToModel(message, contextLength = 0) {
  if (contextLength > 40000) return { taskType: 'longContext', model: MODELS.longContext };

  const scores = {
    coding: count(message, CODING) * 2,
    reasoning: count(message, REASONING) * 3,
    creative: count(message, CREATIVE) * 2,
    speed: count(message, SPEED) * 1.5,
    chat: 1
  };

  if (/```|\.py\b|\.js\b|\.ts\b|\.jsx\b|\.go\b|\.rs\b/.test(message)) scores.coding += 5;
  if (/^(create|write|build|make|generate|implement|fix|refactor)\s/i.test(message.trim())) scores.coding += 3;

  const winner = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
  return { taskType: winner[0], model: MODELS[winner[0]] };
}
