#!/usr/bin/env node
import Axioma from './index.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const client = new Axioma();

  if (command === 'generate' || command === 'gen') {
    const projectPath = args[1] || '.';
    const outputFile = args[2]; 
    
    console.log('Запуск Axioma Code Generator...');
    await client.generateCodeFromTZ(projectPath, outputFile);
  } else if (command === 'chat') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      console.log('Укажите промпт для общения с AI');
      return;
    }
    
    const response = await client.query(prompt, {
      model: "gpt-5-nano",
      system: "You are a helpful AI assistant"
    });
    
    console.log('--->', response);
    
  } else if (command === 'code') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      console.log('Укажите промпт для генерации кода');
      return;
    }
    
    const fullPrompt = `
Генерируй код по запросу: ${prompt}

Верни ТОЛЬКО JSON: { "code": "...", "filename": "...", "type": "..." }
`;
    
    const response = await client.query(fullPrompt, {
      model: "qwen-coder",
      seed: 123,
      system: "You Senior Fullstack-Developer React, Vue, Angular, Fetch, API, REST API and more. Always respond with valid JSON only: {code, filename, type}. No explanations.",
      temperature: 0.3,
      json_response: true
    });
    
    if (response) {
      try {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        console.log('💻 Сгенерированный код:\n', parsed.code || response);
        console.log(`\n📁 Предложенное имя: ${parsed.filename || 'N/A'}`);
        console.log(`Тип: ${parsed.type || 'N/A'}`);
      } catch {
        console.log('💻 Сгенерированный код:\n', response);
      }
    }
    
  } else {
    console.log(`
Axioma CLI - AI-powered code generation tool

Команды:
  generate [path] [output]  - Генерация кода из ТЗ.txt файлов (ИИ предложит имя файла)
  gen [path] [output]       - Короткая версия generate
  chat <prompt>             - Общение с AI
  code <prompt>             - Генерация кода по промпту (с предложением имени)
  help                      - Показать эту справку

Примеры:
  axioma generate .          - Сгенерировать код в текущей папке (ИИ выберет имя)
  axioma gen ./project       - То же, без output — используй предложение ИИ
  axioma chat "Напиши функцию" - Задать вопрос AI
  axioma code "React компонент кнопки" - Сгенерировать код + имя файла

Создайте файл ТЗ.txt в вашем проекте для автоматической генерации кода!
    `);
  }
}

main().catch(console.error);