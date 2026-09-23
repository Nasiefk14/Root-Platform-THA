import SftpClient from "ssh2-sftp-client";
import { sftpConfig } from "../config.ts";

type SftpStep = "connect" | "put" | "rename";

/**
 * Handles error wrapping for SFTP operations, providing user-friendly messages for common failure modes.
 *
 * @param step - The SFTP step being performed ("connect", "put", or "rename").
 * @param error - The raw error object thrown by the SFTP library.
 * @returns {Error} An Error instance with a detailed, contextual message.
 */
// (See implementation below.)

const wrapSftpError = (step: SftpStep, error: unknown): Error => {
    const message: string = error instanceof Error ? error.message : String(error);
    const code: string =
        error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "";
    const level: string =
        error && typeof error === "object" && "level" in error
            ? String((error as { level: unknown }).level)
            : "";
    if (code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
        return new Error(
            `SFTP ${step} failed: could not connect to ${sftpConfig.host}:${sftpConfig.port}. Is the SFTP container running?`
        );
    }
    if (
        level === "client-authentication" ||
        message.toLowerCase().includes("authentication")
    ) {
        return new Error(
            "SFTP connect failed: authentication failed. Check username and password."
        );
    }
    if (code === "ENOTFOUND" || message.includes("ENOTFOUND")) {
        return new Error(
            `SFTP ${step} failed: host ${sftpConfig.host} was not found.`
        );
    }
    if (message.toLowerCase().includes("timed out")) {
        return new Error(
            `SFTP ${step} failed: timed out talking to ${sftpConfig.host}:${sftpConfig.port}.`
        );
    }
    return new Error(`SFTP ${step} failed: ${message}`);
}

/**
 * Uploads a CSV string to an SFTP server. The file is first written with a .tmp suffix
 * and then renamed to its final name to ensure atomic delivery.
 *
 * @param csv - The CSV file content as a string.
 * @param runId - The identifier used to build the destination filename.
 * @returns The final SFTP path of the uploaded file as a string.
 * @throws Error if any step of the SFTP upload fails.
 */
export const deliverToSftp = async (csv: string, runId: string): Promise<string> => {
    const sftp: SftpClient = new SftpClient();
    const tmpName: string = `${sftpConfig.directory}/${runId}.csv.tmp`;
    const finalName: string = `${sftpConfig.directory}/${runId}.csv`;
    let step: SftpStep = "connect";
    try {
        await sftp.connect({
            host: sftpConfig.host,
            port: sftpConfig.port,
            username: sftpConfig.username,
            password: sftpConfig.password,
        });
        step = "put";
        await sftp.put(Buffer.from(csv, "utf8"), tmpName);
        step = "rename";
        await sftp.rename(tmpName, finalName);
        return finalName;
    } catch (error) {
        throw wrapSftpError(step, error);
    } finally {
        await sftp.end();
    }
};
