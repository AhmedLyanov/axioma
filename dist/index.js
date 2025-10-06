// index.ts
import axios from "axios";
export default class Axioma {
    constructor() {
        this.baseUrl = "https://text.pollinations.ai";
    }
    async query(prompt, options = {}) {
        try {
            const encodedPrompt = encodeURIComponent(prompt);
            const url = `${this.baseUrl}/${encodedPrompt}`;
            const response = await axios.get(url, { params: options });
            return options.json_response ? response.data : response.data.toString();
        }
        catch (err) {
            console.error("Error making API request:", err.message);
            return null;
        }
    }
    parseGeneratedOutput(generatedContent) {
        try {
            // Пытаемся парсить как JSON (ИИ должен вернуть { "code": "...", "filename": "...", "type": "..." })
            const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.code && parsed.filename && parsed.type) {
                    const extMap = {
                        react: 'jsx',
                        vue: 'vue',
                        angular: 'ts',
                        html: 'html',
                        css: 'css',
                        python: 'py',
                        nodejs: 'js',
                        typescript: 'ts',
                        javascript: 'js'
                    };
                    return {
                        code: parsed.code,
                        filename: parsed.filename,
                        type: parsed.type.toLowerCase(),
                        extension: extMap[parsed.type.toLowerCase()] || 'js'
                    };
                }
            }
            // Fallback: если не JSON, используем старый метод извлечения
            const fallbackType = this.detectContentTypeFallback(generatedContent);
            const fallbackCode = this.formatCodeFallback(generatedContent, fallbackType.type);
            const fallbackFilename = this.suggestFilenameFromContent(fallbackCode, fallbackType.type);
            return {
                code: fallbackCode,
                filename: fallbackFilename,
                type: fallbackType.type,
                extension: fallbackType.extension
            };
        }
        catch (err) {
            console.error('Ошибка парсинга вывода ИИ:', err);
            return null;
        }
    }
    detectContentTypeFallback(content) {
        const contentLower = content.toLowerCase();
        if (contentLower.includes('react') &&
            (contentLower.includes('jsx') || contentLower.includes('tsx') ||
                contentLower.includes('</div>') || contentLower.includes('</button>'))) {
            return { type: 'react', extension: 'jsx' };
        }
        if (contentLower.includes('vue') &&
            (contentLower.includes('<template>') || contentLower.includes('vue.component'))) {
            return { type: 'vue', extension: 'vue' };
        }
        if (contentLower.includes('angular') && contentLower.includes('@component')) {
            return { type: 'angular', extension: 'ts' };
        }
        if ((contentLower.includes('html') && contentLower.includes('</')) ||
            contentLower.includes('<!doctype') || contentLower.includes('<html>')) {
            return { type: 'html', extension: 'html' };
        }
        if (contentLower.includes('css') &&
            (contentLower.includes('{') && contentLower.includes('}'))) {
            return { type: 'css', extension: 'css' };
        }
        if (contentLower.includes('python') &&
            (contentLower.includes('def ') || contentLower.includes('import ') || contentLower.includes('class '))) {
            return { type: 'python', extension: 'py' };
        }
        if (contentLower.includes('node.js') ||
            (contentLower.includes('express') && contentLower.includes('require(')) ||
            contentLower.includes('module.exports')) {
            return { type: 'nodejs', extension: 'js' };
        }
        if (contentLower.includes('typescript') ||
            (contentLower.includes('interface') && contentLower.includes(':')) ||
            contentLower.includes('const ')) {
            return { type: 'typescript', extension: 'ts' };
        }
        return { type: 'javascript', extension: 'js' };
    }
    formatCodeFallback(content, type) {
        let cleanedContent = content;
        // Извлекаем блоки кода из Markdown
        const codeBlocks = content.match(/```(?:[\w]*)\n([\s\S]*?)```/g);
        if (codeBlocks && codeBlocks.length > 0) {
            cleanedContent = codeBlocks.map(block => {
                return block.replace(/```[\w]*\n/, '').replace(/```$/, '');
            }).join('\n\n');
        }
        else {
            // Fallback: ищем начало кода
            const codeStarts = [
                'import ', 'export ', 'function ', 'const ', 'let ', 'var ',
                'class ', 'interface ', '<!DOCTYPE', '<html', 'def ', 'from ',
                'React.', 'vue.', 'angular.'
            ];
            for (const start of codeStarts) {
                const index = content.indexOf(start);
                if (index !== -1) {
                    cleanedContent = content.substring(index);
                    break;
                }
            }
        }
        // Удаляем объяснения
        const explanationMarkers = [
            '\nЭтот код', '\nДанный код', '\nКомпонент', '\nФункция',
            '\nПримечание', '\nВажно:', '\nNote:', '\nThis code'
        ];
        for (const marker of explanationMarkers) {
            const index = cleanedContent.indexOf(marker);
            if (index !== -1) {
                cleanedContent = cleanedContent.substring(0, index);
                break;
            }
        }
        return cleanedContent.trim();
    }
    suggestFilenameFromContent(code, type) {
        // Простой fallback: извлекаем имя из кода (например, const MyComponent = ...)
        const componentMatch = code.match(/const\s+(\w+)/) || code.match(/class\s+(\w+)/) || code.match(/export\s+default\s+(\w+)/);
        if (componentMatch) {
            return `${componentMatch[1]}.${this.getExtension(type)}`;
        }
        // Или по типу
        return `Generated.${this.getExtension(type)}`;
    }
    getExtension(type) {
        const extMap = {
            react: 'jsx',
            vue: 'vue',
            angular: 'ts',
            html: 'html',
            css: 'css',
            python: 'py',
            nodejs: 'js',
            typescript: 'ts',
            javascript: 'js'
        };
        return extMap[type.toLowerCase()] || 'js';
    }
    async generateCodeFromTZ(projectPath = ".", outputFile) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const tzFiles = [];
            function findTZFiles(dir) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
                        findTZFiles(filePath);
                    }
                    else if (file === 'ТЗ.txt' || file === 'tz.txt' || file === 'specification.txt') {
                        tzFiles.push(filePath);
                    }
                }
            }
            findTZFiles(projectPath);
            if (tzFiles.length === 0) {
                console.log('❌ Файлы ТЗ.txt не найдены в проекте');
                return;
            }
            console.log(`📋 Найдено файлов ТЗ: ${tzFiles.length}`);
            let tzContent = '';
            for (const tzFile of tzFiles) {
                console.log(`📖 Читаем файл: ${tzFile}`);
                const content = fs.readFileSync(tzFile, 'utf-8');
                tzContent += `\n\n=== Файл: ${tzFile} ===\n${content}`;
            }
            const prompt = `
На основе следующего технического задания создай полноценный код.

${tzContent}

Требования к коду:
1. Должен быть рабочим и готовым к использованию.
2. Должен соответствовать лучшим практикам.
3. Код должен решать поставленные в ТЗ задачи.

ВАЖНО: Верни ответ ТОЛЬКО в формате JSON без каких-либо пояснений, комментариев или дополнительного текста:
{
  "code": "полный чистый код здесь (без комментариев)",
  "filename": "рекомендуемое имя файла, например MyComponent.jsx",
  "type": "тип технологии, например react, vue, python"
}

Пример JSON:
{
  "code": "import React from 'react'; ...",
  "filename": "MyButton.jsx",
  "type": "react"
}
`;
            console.log('🤖 Генерирую код с помощью AI...');
            const generatedCode = await this.query(prompt, {
                model: "mistral",
                seed: 123,
                system: "You Senior Fullstack-Developer React, Vue, Angular, Fetch, API, REST API, Node.js, Python and more. Always respond with valid JSON only: {code, filename, type}. No explanations.",
                temperature: 0.3, // Понижаем для стабильности JSON
                json_response: true
            });
            if (generatedCode) {
                const output = this.parseGeneratedOutput(generatedCode);
                if (output && output.code) {
                    const finalOutputFile = outputFile || output.filename;
                    const outputPath = path.join(projectPath, finalOutputFile);
                    fs.writeFileSync(outputPath, output.code);
                    console.log(`Код успешно сгенерирован!`);
                    console.log(`Тип: ${output.type}`);
                    console.log(`Файл: ${outputPath}`);
                    console.log(`Размер: ${output.code.length} символов`);
                    console.log('\nПревью кода:');
                    console.log('='.repeat(50));
                    const preview = output.code.split('\n').slice(0, 10).join('\n');
                    console.log(preview);
                    if (output.code.split('\n').length > 10) {
                        console.log('... (и еще ' + (output.code.split('\n').length - 10) + ' строк)');
                    }
                    console.log('='.repeat(50));
                }
                else {
                    console.log('❌ Не удалось распарсить вывод ИИ. Проверьте промпт.');
                }
            }
            else {
                console.log('Ошибка при генерации кода');
            }
        }
        catch (error) {
            console.error('Ошибка:', error.message);
        }
    }
}
