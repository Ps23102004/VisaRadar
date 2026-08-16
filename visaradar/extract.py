from __future__ import annotations

import json
from dataclasses import dataclass


@dataclass
class JobPosting:
    company: str
    title: str
    location: str
    sponsorship_language: str
    stance: str


def build_extraction_prompt(posting_text: str) -> str:
    truncated = posting_text[:6000]
    return (
        "Read the job posting below. Respond with ONLY a JSON object (raw JSON, "
        "no markdown code fences, no explanation) with exactly these keys:\n"
        "- company: string\n"
        "- title: string\n"
        "- location: string (empty string if not stated)\n"
        "- sponsorship_language: string (verbatim quote or close paraphrase of any "
        "sponsorship-related sentence in the posting, empty string if none)\n"
        "- stance: string, exactly one of \"sponsors\", \"no_sponsor\", or \"silent\", "
        "based on whether the posting explicitly offers visa sponsorship, explicitly "
        "states it does NOT sponsor, or says nothing about it.\n\n"
        "Job posting text:\n" + truncated
    )


def parse_extraction(raw: str) -> JobPosting:
    data = None
    try:
        data = json.loads(raw.strip())
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                data = json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                data = None

    if not isinstance(data, dict):
        raise ValueError("could not parse a JobPosting from LLM response")

    company = data.get("company", "")
    title = data.get("title", "")

    if not isinstance(company, str) or not company.strip():
        raise ValueError("could not parse a JobPosting from LLM response")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("could not parse a JobPosting from LLM response")

    location = data.get("location", "")
    if not isinstance(location, str):
        location = ""

    sponsorship_language = data.get("sponsorship_language", "")
    if not isinstance(sponsorship_language, str):
        sponsorship_language = ""

    stance = data.get("stance", "silent")
    if stance not in ("sponsors", "no_sponsor", "silent"):
        stance = "silent"

    return JobPosting(
        company=company,
        title=title,
        location=location,
        sponsorship_language=sponsorship_language,
        stance=stance,
    )
