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
    parseMultiFileOutput(generatedContent) {
        try {
            const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.files && Array.isArray(parsed.files)) {
                    const files = [];
                    for (const fileData of parsed.files) {
                        if (fileData.code && fileData.filename) {
                            const extMap = {
                                react: 'jsx', vue: 'vue', angular: 'ts', html: 'html',
                                css: 'css', python: 'py', nodejs: 'js', typescript: 'ts',
                                javascript: 'js', json: 'json', md: 'md', txt: 'txt'
                            };
                            const type = fileData.type?.toLowerCase() || this.detectContentType(fileData.code);
                            const extension = fileData.extension || extMap[type] || 'js';
                            files.push({
                                code: fileData.code,
                                filename: fileData.filename,
                                type: type,
                                extension: extension,
                                path: fileData.path
                            });
                        }
                    }
                    return {
                        files,
                        projectStructure: parsed.projectStructure,
                        instructions: parsed.instructions
                    };
                }
                if (parsed.code && parsed.filename) {
                    const extMap = {
                        react: 'jsx', vue: 'vue', angular: 'ts', html: 'html',
                        css: 'css', python: 'py', nodejs: 'js', typescript: 'ts',
                        javascript: 'js'
                    };
                    return {
                        files: [{
                                code: parsed.code,
                                filename: parsed.filename,
                                type: parsed.type?.toLowerCase() || 'javascript',
                                extension: extMap[parsed.type?.toLowerCase()] || 'js'
                            }]
                    };
                }
            }
            const fallbackType = this.detectContentType(generatedContent);
            const fallbackCode = this.formatCode(generatedContent, fallbackType.type);
            const fallbackFilename = this.suggestFilenameFromContent(fallbackCode, fallbackType.type);
            return {
                files: [{
                        code: fallbackCode,
                        filename: fallbackFilename,
                        type: fallbackType.type,
                        extension: fallbackType.extension
                    }]
            };
        }
        catch (err) {
            console.error('Error parsing AI output:', err);
            return null;
        }
    }
    detectContentType(content) {
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
    formatCode(content, type) {
        let cleanedContent = content;
        const codeBlocks = content.match(/```(?:[\w]*)\n([\s\S]*?)```/g);
        if (codeBlocks && codeBlocks.length > 0) {
            cleanedContent = codeBlocks.map(block => {
                return block.replace(/```[\w]*\n/, '').replace(/```$/, '');
            }).join('\n\n');
        }
        else {
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
        const explanationMarkers = [
            '\nThis code', '\nThe code', '\nComponent', '\nFunction',
            '\nNote:', '\nImportant:', '\nThis function'
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
        const componentMatch = code.match(/const\s+(\w+)/) || code.match(/class\s+(\w+)/) || code.match(/export\s+default\s+(\w+)/);
        if (componentMatch) {
            return `${componentMatch[1]}.${this.getExtension(type)}`;
        }
        return `Generated.${this.getExtension(type)}`;
    }
    getExtension(type) {
        const extMap = {
            react: 'jsx', vue: 'vue', angular: 'ts', html: 'html',
            css: 'css', python: 'py', nodejs: 'js', typescript: 'ts',
            javascript: 'js', json: 'json', md: 'md'
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
                    else if (file === 'TT.txt' || file === 'tt.txt' || file === 'specification.txt') {
                        tzFiles.push(filePath);
                    }
                }
            }
            findTZFiles(projectPath);
            if (tzFiles.length === 0) {
                console.log('TT.txt files not found in project');
                return;
            }
            console.log(`Found TZ files: ${tzFiles.length}`);
            let tzContent = '';
            for (const tzFile of tzFiles) {
                console.log(`Reading file: ${tzFile}`);
                const content = fs.readFileSync(tzFile, 'utf-8');
                tzContent += `\n\n=== File: ${tzFile} ===\n${content}`;
            }
            const prompt = `
Based on the following technical specification, create complete code.

TECHNICAL SPECIFICATION:
${tzContent}

IMPORTANT REQUIREMENTS:
1. Analyze if this requires multiple files (HTML+CSS+JS, React components, etc.)
2. If multiple files are needed, create a complete project structure
3. All code must be working and follow best practices
4. Include necessary configuration files if needed

RESPONSE FORMAT:
Return ONLY valid JSON. Choose one format:

SINGLE FILE (if simple component):
{
  "code": "full code here",
  "filename": "filename.extension", 
  "type": "technology"
}

MULTI-FILE (if project/website):
{
  "files": [
    {
      "code": "code content 1",
      "filename": "filename1.extension",
      "type": "technology1",
      "path": "optional/subpath" 
    },
    {
      "code": "code content 2", 
      "filename": "filename2.extension",
      "type": "technology2"
    }
  ],
  "projectStructure": ["file1", "folder/file2"],
  "instructions": "Brief setup instructions"
}

EXAMPLES:
For a website: HTML, CSS, JS files
For React app: components, package.json, etc.
For Python project: main.py, requirements.txt, etc.
`;
            console.log('Generating code with AI...');
            const generatedCode = await this.query(prompt, {
                model: "mistral",
                seed: 123,
                system: `You are a Senior Fullstack Developer. Analyze the technical specification and create appropriate code. 
        If it's a simple component, return single file. If it's a website/project, return multiple files with complete structure.
        ALWAYS respond with valid JSON only. No explanations.`,
                temperature: 0.3,
                json_response: true
            });
            if (generatedCode) {
                const output = this.parseMultiFileOutput(generatedCode);
                if (output && output.files.length > 0) {
                    console.log(`\nGenerated ${output.files.length} file(s):`);
                    for (const file of output.files) {
                        let filePath;
                        if (outputFile && output.files.length === 1) {
                            filePath = path.join(projectPath, outputFile);
                        }
                        else if (file.path) {
                            const dirPath = path.join(projectPath, path.dirname(file.path));
                            if (!fs.existsSync(dirPath)) {
                                fs.mkdirSync(dirPath, { recursive: true });
                            }
                            filePath = path.join(projectPath, file.path, file.filename);
                        }
                        else {
                            filePath = path.join(projectPath, file.filename);
                        }
                        fs.writeFileSync(filePath, file.code);
                        console.log(`✓ Created: ${filePath} (${file.type})`);
                    }
                    if (output.projectStructure) {
                        console.log('\nProject structure:');
                        output.projectStructure.forEach(item => console.log(`  📁 ${item}`));
                    }
                    if (output.instructions) {
                        console.log('\nInstructions:', output.instructions);
                    }
                    console.log(`\nTotal: ${output.files.length} files created successfully!`);
                }
                else {
                    console.log('Failed to parse AI output. Check the prompt.');
                }
            }
            else {
                console.log('Error generating code');
            }
        }
        catch (error) {
            console.error('Error:', error.message);
        }
    }
}
