import re
import socket
import logging
from typing import Dict, Any, List, Optional
import dns.resolver

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class EmailVerifier:
    @staticmethod
    def validate_syntax(email: str) -> bool:
        """Check RFC 5322 regex syntax."""
        if not email or len(email) > 254:
            return False
        return bool(EMAIL_REGEX.match(email))

    @staticmethod
    def get_mx_records(domain: str) -> List[str]:
        """Query DNS for MX records ordered by preference."""
        try:
            answers = dns.resolver.resolve(domain, "MX")
            records = sorted(answers, key=lambda r: r.preference)
            return [str(r.exchange).rstrip(".") for r in records]
        except Exception as e:
            logger.debug(f"DNS MX lookup failed for {domain}: {e}")
            return []

    @classmethod
    def verify_smtp_handshake(
        cls,
        email: str,
        timeout: int = 5
    ) -> Dict[str, Any]:
        """
        RFC 5321 Port 25 SMTP handshake probe.
        Checks HELO -> MAIL FROM -> RCPT TO -> RSET/QUIT without sending email.
        Also probes a bogus address on the same domain to detect Catch-All servers.
        """
        if not cls.validate_syntax(email):
            return {
                "email": email,
                "status": "invalid",
                "score": 0,
                "mx_found": False,
                "reason": "Invalid email syntax"
            }

        domain = email.split("@")[1].lower()
        mx_hosts = cls.get_mx_records(domain)

        if not mx_hosts:
            return {
                "email": email,
                "status": "invalid",
                "score": 0,
                "mx_found": False,
                "reason": f"No MX records found for {domain}"
            }

        mx_host = mx_hosts[0]

        # Check port 25 connection
        try:
            s = socket.create_connection((mx_host, 25), timeout=timeout)
        except (socket.timeout, socket.error, OSError) as e:
            # Many residential ISPs block outbound Port 25.
            # In that case, DNS MX verification succeeds and we flag port 25 block.
            return {
                "email": email,
                "status": "mx_verified",
                "score": 60,
                "mx_found": True,
                "mx_host": mx_host,
                "is_catch_all": False,
                "reason": f"MX valid, Port 25 blocked by local network ({e})"
            }

        try:
            # 1. Read greeting banner
            banner = s.recv(1024).decode("latin-1", errors="ignore")
            if not banner.startswith("220"):
                s.close()
                return {
                    "email": email,
                    "status": "error",
                    "score": 40,
                    "mx_found": True,
                    "mx_host": mx_host,
                    "reason": f"Unexpected banner: {banner.strip()}"
                }

            # 2. EHLO / HELO
            s.sendall(b"EHLO personalgtm.local\r\n")
            ehlo_resp = s.recv(1024).decode("latin-1", errors="ignore")
            if not ehlo_resp.startswith("250"):
                s.sendall(b"HELO personalgtm.local\r\n")
                s.recv(1024)

            # 3. MAIL FROM
            s.sendall(b"MAIL FROM:<probe@personalgtm.local>\r\n")
            mail_resp = s.recv(1024).decode("latin-1", errors="ignore")
            if not mail_resp.startswith("250"):
                s.sendall(b"QUIT\r\n")
                s.close()
                return {
                    "email": email,
                    "status": "error",
                    "score": 40,
                    "mx_found": True,
                    "mx_host": mx_host,
                    "reason": f"MAIL FROM rejected: {mail_resp.strip()}"
                }

            # 4. Probe target RCPT TO
            s.sendall(f"RCPT TO:<{email}>\r\n".encode("latin-1"))
            rcpt_resp = s.recv(1024).decode("latin-1", errors="ignore")

            # Extract status code
            code = 0
            if rcpt_resp and len(rcpt_resp) >= 3 and rcpt_resp[:3].isdigit():
                code = int(rcpt_resp[:3])

            if code == 250:
                # 5. Catch-All check: probe a random non-existent mailbox
                bogus_email = f"gtm_probe_random_xyz981273@{domain}"
                s.sendall(f"RCPT TO:<{bogus_email}>\r\n".encode("latin-1"))
                bogus_resp = s.recv(1024).decode("latin-1", errors="ignore")

                is_catch_all = bogus_resp.startswith("250")

                s.sendall(b"RSET\r\nQUIT\r\n")
                s.close()

                if is_catch_all:
                    return {
                        "email": email,
                        "status": "catch_all",
                        "score": 50,
                        "mx_found": True,
                        "mx_host": mx_host,
                        "smtp_code": code,
                        "is_catch_all": True,
                        "reason": "Domain accepts all addresses (Catch-All)"
                    }
                else:
                    return {
                        "email": email,
                        "status": "valid",
                        "score": 95,
                        "mx_found": True,
                        "mx_host": mx_host,
                        "smtp_code": code,
                        "is_catch_all": False,
                        "reason": "Mailbox verified via RFC 5321 250 OK"
                    }
            elif code in (550, 551, 553):
                s.sendall(b"QUIT\r\n")
                s.close()
                return {
                    "email": email,
                    "status": "invalid",
                    "score": 0,
                    "mx_found": True,
                    "mx_host": mx_host,
                    "smtp_code": code,
                    "reason": f"Mailbox rejected with {code}: {rcpt_resp.strip()}"
                }
            else:
                s.sendall(b"QUIT\r\n")
                s.close()
                return {
                    "email": email,
                    "status": "risky",
                    "score": 40,
                    "mx_found": True,
                    "mx_host": mx_host,
                    "smtp_code": code,
                    "reason": f"Temporary rejection or greylisting: {rcpt_resp.strip()}"
                }

        except Exception as e:
            try:
                s.close()
            except Exception:
                pass
            return {
                "email": email,
                "status": "timeout",
                "score": 30,
                "mx_found": True,
                "mx_host": mx_host,
                "reason": f"Socket error during handshake: {e}"
            }
