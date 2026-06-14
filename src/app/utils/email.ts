import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { envVars as config } from "../config/env";

export const sendEmail = async (
    to: string,
    subject: string,
    templateName: string,
    templateData: Record<string, any>
) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT) || 587,
            auth: {
                user: config.EMAIL_USER,
                pass: config.EMAIL_PASS,
            },
        });

        const templatePath = path.join(__dirname, "../templates", `${templateName}.ejs`);
        const html = await ejs.renderFile(templatePath, templateData);

        const mailOptions = {
            from: `"Planora" <${config.EMAIL_USER}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email: ", error);
        throw new Error("Failed to send email");
    }
};
