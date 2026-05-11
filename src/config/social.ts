import type { SocialLink } from "../types";

export const SOCIALS: SocialLink[] = [
    {
        name: "Github",
        href: "https://github.com/kmarulab",
        linkTitle: `Follow Kimaru Boruett on Github`,
        isActive: true,
    },
    {
        name: "Mail",
        href: "mailto:emkboruett@gmail.com",
        linkTitle: `Send an email to Kimaru Boruett`,
        isActive: true,
    },
    {
        name: "Medium",
        href: "https://emkboruett.medium.com/",
        linkTitle: `Read Kimaru Boruett on Medium`,
        isActive: true,
    },
];

export const SOCIAL_ICONS: Record<string, string> = {
    Github: "Github",
    Mail: "Mail",
    Linkedin: "LinkedIn",
    "Google Scholar": "GoogleScholar",
    ORCID: "ORCID",
    RSS: "RSS",
    Medium: "ExternalLink",
};
