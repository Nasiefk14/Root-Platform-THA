export const sftpConfig = {
    host: process.env.SFTP_HOST,
    port: Number(process.env.SFTP_PORT),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
    directory: process.env.SFTP_DIR,
};