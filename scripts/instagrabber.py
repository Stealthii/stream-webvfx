#!/usr/bin/env python

import errno
import json
import logging
import os
import requests

from apscheduler.schedulers.blocking import BlockingScheduler
from instagram.bind import InstagramAPIError
from instagram.bind import InstagramClientError
from instagram.client import InstagramAPI

client_id = "e57454d58e8a43b5b1e523b0016e42d1"
client_secret = "2be7470623f54bb98d3f1ebe86299ed1"
tag_name = "rehabstudio"
output_dir = "assets/instagram_photos"


output_dir = os.path.abspath(output_dir)
output_json = output_dir + ".json"

try:
    os.makedirs(output_dir)
except OSError as exception:
    if exception.errno != errno.EEXIST:
        raise

try:
    api = InstagramAPI(client_id=client_id, client_secret=client_secret)
except InstagramClientError as e:
    logging.error("Instagrabber: Client error - {}".format(e.error_message))
    raise


def get_images():
    try:
        rehab_party, _ = api.tag_recent_media(tag_name=tag_name, count=20)
    except InstagramAPIError as e:
        logging.warning("Instagrabber: API error - {}".format(e.error_message))

    for media in rehab_party:
        if media.type != 'image':
            pass  # fuck videos man

        # Name file after media id
        output_file = os.path.join(output_dir, media.id + ".jpg")
        output_json = os.path.join(output_dir, media.id + ".json")
        if not (os.path.exists(output_file) and os.path.exists(output_json)):
            logging.info("Instagrabber: Downloading {}...".format(media.id))
            r = requests.get(media.images['standard_resolution'].url)
            with open(output_file, 'wb') as f:
                f.write(r.content)

            # JSON data
            file_info = json.dumps(
                {
                    # "caption": media.caption,
                    "filename": output_file,
                    "tags": [tag.name for tag in media.tags]
                }
            )
            with open(output_json, 'wb') as j:
                j.write(file_info)


if __name__ == "__main__":
    get_images()  # do one now for good measure
    scheduler = BlockingScheduler()
    scheduler.add_job(get_images, 'interval', minutes=15)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        pass
