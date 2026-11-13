#!/bin/sh
set -eu
# Install as an executable Certbot deploy hook after issuing the EasyPet certificate.
case "${RENEWED_LINEAGE:-}" in
    /etc/letsencrypt/live/easypet.innker.com.br)
        /usr/sbin/nginx -t
        /usr/bin/systemctl reload nginx
        ;;
esac
