# **App Name**: Troubleshooter.ai

## Core Features:

- Probable Cause Generator: Generate probable causes from an error log. The error log should be provided by the user, and Troubleshooter.ai should display them as possibilities. The LLM will use reasoning as a tool to generate the probable causes of the error and display them to the user.
- Solution Generator: Generate potential solutions for errors based on the probable causes generated from the error log provided by the user, Troubleshooter.ai should provide the user with solutions for the probable causes that were presented in the previous step. The LLM will use reasoning as a tool to generate potential solutions to errors. The solutions should be helpful and relevant.
- File Upload: An easy way for the user to upload an error log file.
- Probable Cause Display: A UI element which clearly displays any probable causes generated from the log file.
- Solution Display: A UI element which displays any potential solutions generated from the error log file, corresponding with each possible cause.

## Style Guidelines:

- Primary color: HSL 220, 67%, 55% (Hex: #4683E3). A calming yet confident blue to inspire trust in the troubleshooting process.
- Background color: HSL 220, 20%, 97% (Hex: #F4F6F9). A very light blue, creating a clean and unobtrusive background.
- Accent color: HSL 190, 60%, 45% (Hex: #2EBAC6). A contrasting teal, to draw attention to key elements like the error upload button.
- Body text and headlines: 'Inter', a grotesque-style sans-serif font. Note: currently only Google Fonts are supported.
- Use clear and easily recognizable icons from a standard library, to represent different types of errors, solutions, and file types.
- Emphasize clarity with generous whitespace and logical grouping of elements. Error display and solution display sections should be clearly visually distinguished.
- Use subtle animations when displaying probable causes or solutions, to avoid distraction.