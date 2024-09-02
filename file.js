import fs from 'fs';
import readline from 'readline';
import splitFile from 'split-file';
import md5File from 'md5-file';
import { log, spinner, yellow } from './helper.js';
import { MIN_CHUNK_SIZE } from './.env';

const checkFolderAndPrompt = (dirname) => {
    if (fs.existsSync(dirname) && dirname.endsWith('_chunks')) {
        log('yellow', '\n\n- Chunks found, skipping rechunking and proceeding to sync...\n\n');
        return false;
    } else {
        log('yellow', '\n\n- Folder does not exist or does not end with "_chunks".\n\n');
        return true;
    }
}

const dumpManifest = (fPath, manifest) => {
    try {
        fs.writeFileSync(fPath, JSON.stringify(manifest, null, 2));
        return JSON.stringify(manifest, null, 2);
    } catch (e) {
        log('red', '\nERROR: Cannot write chunk manifest...\n\n');
        return null;
    }
}

const loadManifest = (fPath) => {
    try {
        const data = fs.readFileSync(fPath, 'utf8');
        return data;
    } catch (e) {
        log('red', '\nERROR: Cannot read or parse chunk manifest...\n\n');
        return null;
    }
}

const buildChunkManifest = async (chunkList, chunkSize) => {
    let progress = spinner(yellow('Building chunk manifest file...   '));
    progress.start();

    try {
        let destDir = chunkList[0].split('/')[0];
        let chunkManifest = {
            chunkSize,
            chunks: []
        }

        //build manifest
        chunkList.forEach(chunk => {
            chunkManifest.chunks.push({
                chunk: chunk,
                hash: md5File.sync(chunk)
            });
        });

        //dump manifest
        let manifestFile = dumpManifest(`${destDir}/manifest.json`, chunkManifest);
        progress.stop();

        return manifestFile;
    } catch (e) {
        console.log(e)
        log('red', '\nERROR: Cannot generate chunk manifest...');
        return null;
    }
}

export const file2chunkDir = (file) => {
    return `${file}_chunks`;
}

export const file2Manifest = (file) => {
    return `${file2chunkDir(file)}/manifest.json`;
}

export const fileExists = (file) => {
    return fs.existsSync(file);
}

export const chunkFile = async (file, cs, autocs) => {
    //calculate right chunkSize (min 4K)
    let fSize = fs.statSync(file).size;
    let chunkSize = autocs ? Math.max(Math.min(cs, fSize), MIN_CHUNK_SIZE) : cs;
    let chunkDir = file2chunkDir(file);
    let manifestDir = file2Manifest(file);
    let progress = spinner(yellow('Chunking file...   '));
    if (!checkFolderAndPrompt(chunkDir)) { 
        return loadManifest(manifestDir);
    }
    try {
        //create chinks dir and chink file
        log('yellow', `\n\n- Chunking file into ${chunkSize} byte chunks...\n\n`);
        progress.start();

        makeDir(chunkDir);
        let chunkList = await splitFile.splitFileBySize(file, chunkSize, chunkDir);
        progress.stop();

        //build chink Manifest file
        let manifestFile = await buildChunkManifest(chunkList, chunkSize);

        return manifestFile;
    } catch(e) {
        log('red', 'ERROR: Cannot chunk file...');
        process.exit(1);
    }
}

export const mergeChunks = async (chunk_list, filename) => {
    await splitFile.mergeFiles(chunk_list, filename);
};

export const delChunks = (file) => {
    try {
        fs.rmSync(file2chunkDir(file), {recursive: true});
    } catch(e) {
        log('red', 'WARNING: Cannot remove chunks dir...');
    }
}

export const readFile = (file) => {
    return fs.readFileSync(file);
}

export const writeFile = (file, bytes) => {
    return fs.writeFileSync(file, bytes);
};

export const makeDir = (dir) => {
    return fs.mkdirSync(dir, { recursive: true });
}