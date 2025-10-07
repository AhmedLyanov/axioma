#!/usr/bin/env node
import Axioma from './index.js';
import figlet from 'figlet';
import ora from 'ora';
import cliSpinners from 'cli-spinners';
import chalk from 'chalk';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  const client = new Axioma();

  if (command === 'generate' || command === 'gen') {
    const projectPath = args[1] || '.';
    const outputFile = args[2]; 
    
    console.log('Starting Axioma Code Generator...');
    await client.generateCodeFromTZ(projectPath, outputFile);
    
  } else if (command === 'chat') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      console.log('Please provide a prompt for AI conversation');
      return;
    }
    
    const spinner = ora({
      text: 'AI thinking...',
      spinner: cliSpinners.dots
    }).start();
    
    try {
      const response = await client.query(prompt, {
        model: "gpt-5-nano",
        system: "You are a helpful AI assistant"
      });
      
      spinner.succeed('Response received!');
      console.log('--->', response);
      
    } catch (error: unknown) {
      spinner.fail('Error!');
      if (error instanceof Error) {
        console.log('Error:', error.message);
      } else {
        console.log('Unknown error');
      }
    }
    
  } else if (command === 'code') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      console.log('Please provide a prompt for code generation');
      return;
    }
    
    const spinner = ora({
      text: 'Generating code...',
      spinner: cliSpinners.binary
    }).start();
    
    const fullPrompt = `
Generate code for: ${prompt}

Return ONLY JSON: { "code": "...", "filename": "...", "type": "..." }
`;
    
    try {
      const response = await client.query(fullPrompt, {
        model: "qwen-coder",
        seed: 123,
        system: "You Senior Fullstack-Developer React, Vue, Angular, Fetch, API, REST API and more. Always respond with valid JSON only: {code, filename, type}. No explanations.",
        temperature: 0.3,
        json_response: true
      });
      
      spinner.succeed('Code generated!');
      
      if (response) {
        try {
          const parsed = typeof response === 'string' ? JSON.parse(response) : response;
          
          console.log('\nGenerated code:\n', (parsed as any).code || response);
          console.log(`\nSuggested filename: ${(parsed as any).filename || 'N/A'}`);
          console.log(`Type: ${(parsed as any).type || 'N/A'}`);
          
        } catch {
          console.log('Generated code:\n', response);
        }
      }
      
    } catch (error: unknown) {
      spinner.fail('Generation error!');
      if (error instanceof Error) {
        console.log('Error:', error.message);
      } else {
        console.log('Unknown generation error');
      }
    }
    
  } else {
    console.log(`Unknown command: ${command}`);
    showHelp();
  }
}

function showHelp(): void {
  console.log(
    chalk.blue(
      figlet.textSync('AxIoma CLI', {
        font: 'Big',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  );
  
  console.log(`
Axioma CLI - AI-powered code generation tool

Commands:
  generate [path] [output]  - Generate code from TT.txt files
  gen [path] [output]       - Short version of generate
  chat <prompt>             - Chat with AI
  code <prompt>             - Generate code from prompt
  help                      - Show this help

Examples:
  axioma generate .          - Generate code in current folder
  axioma gen ./project       - Generate code in specified folder
  axioma chat "Write a function" - Ask AI a question
  axioma code "React button component" - Generate code

Create TT.txt file in your project for automatic code generation!
  `);
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.log('Error:', error.message);
  } else {
    console.log('Unknown error');
  }
  process.exit(1);
});