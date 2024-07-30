import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";    
import { file2chunkDir, readFile } from "./file.js";
import { log } from "./helper.js";

// const client = new S3Client();

const client = new S3Client({
  requestHandler: new NodeHttpHandler({
    socketAcquisitionWarningTimeout: 5000,
    httpsAgent: new https.Agent({
      maxSockets: 100
    })
  })
});

export const bucketExists = async (bucket) => {
  try {
    const command = new HeadBucketCommand({ Bucket: bucket });
    await client.send(command);

    return true;
  } catch (e) {
    return false;
  }
};

export const objectExists = async (bucket, object) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: object,
    });
    await client.send(command);
    return true;
  } catch (e) {
    return false;
  }
};

const readObject = async (bucket, file) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: file,
    });
    const response = await client.send(command);
    return response.Body;
  } catch (e) {
    return null;
  }
};

export const writeObject = async (bucket, file) => {
  let data = readFile(file);
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: file,
      Body: data,
    });
    const response = await client.send(command);
  } catch (e) {
    log("red", "ERROR: Cannot write an object to S3");
    process.exit(1);
  }
};

export const deleteObject = async (bucket, file) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: file,
    });
    const response = await client.send(command);
  } catch (e) {
    log("red", "ERROR: Cannot delete an object from S3");
    process.exit(1);
  }
};

export const getManifest = async (bucket, file) => {
  log("yellow", "- Getting manifest file from S3...");
  try {
    let manifestFile = `${file2chunkDir(file)}/manifest.json`;
    let manifestRaw = await readObject(bucket, manifestFile);
    let manifest = JSON.parse(await manifestRaw.transformToString());
    log("green", "...OK\n\n");
    return manifest;
  } catch (e) {
    return null;
  }
};

export const getChunk = async (bucket, chunk) => {
  try {
    const raw_chunk = await readObject(bucket, chunk);
    return await raw_chunk.transformToByteArray();
  } catch (e) {
    return null;
  }
};
