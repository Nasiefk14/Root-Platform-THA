import SftpClient from "ssh2-sftp-client";
import { sftpConfig } from "../config.ts";

/**
 * Uploads a CSV string to an SFTP server. The file is first written with a .tmp suffix
 * and then renamed to its final name to ensure atomic delivery.
 *
 * @param csv - The CSV file content as a string.
 * @param runId - The identifier used to build the destination filename.
 * @returns The final SFTP path of the uploaded file as a string.
 * @throws Error if any step of the SFTP upload fails.
 */
export async function deliverToSftp(csv: string, runId: string): Promise<string> {
    const sftp: SftpClient = new SftpClient();
    const tmpName: string = `${sftpConfig.directory}/${runId}.csv.tmp`;
    const finalName: string = `${sftpConfig.directory}/${runId}.csv`;

    try {
        await sftp.connect({
            host: sftpConfig.host,
            port: sftpConfig.port,
            username: sftpConfig.username,
            password: sftpConfig.password,
        });
        await sftp.put(Buffer.from(csv, "utf8"), tmpName);
        await sftp.rename(tmpName, finalName);
        return finalName;
    } catch (error) {
        const message: string = error instanceof Error ? error.message : String(error);
        throw new Error(`SFTP delivery failed: ${message}`);
    } finally {
        await sftp.end();
    }
}
