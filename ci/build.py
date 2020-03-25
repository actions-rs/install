import os
import os.path
import sys
import logging
import logging.config
import subprocess

import boto3
import requests

S3_REGION = 'us-east-2'
S3_BUCKET = 'actions-rs.install.binary-cache'
S3_OBJECT_URL = 'https://s3.{region}.amazonaws.com/{bucket}/{{object_name}}'.format(
    region=S3_REGION,
    bucket=S3_BUCKET,
)
S3_OBJECT_NAME = '{crate}/{runner}/{crate}-{version}{ext}'

MAX_VERSIONS_TO_BUILD = 1


def crate_info(crate):
    url = 'https://crates.io/api/v1/crates/{}'.format(crate)
    logging.info('Requesting crates.io URL: {}'.format(url))

    resp = requests.get(url)
    resp.raise_for_status()

    versions = filter(lambda v: not v['yanked'], resp.json()['versions'])
    for version in list(versions)[:MAX_VERSIONS_TO_BUILD]:
        yield version['num']


def exists(runner, crate, version):
    """Check if `crate` with version `version` for `runner` environment
    already exists in the S3 bucket."""

    ext = '.exe' if runner.lower().startswith('windows') else ''
    object_name = S3_OBJECT_NAME.format(
        crate=crate,
        runner=runner,
        version=version,
        ext=ext,
    )
    url = S3_OBJECT_URL.format(object_name=object_name)
    logging.info(
        'Check if {crate} == {version} for {runner} exists in S3 bucket at {url}'.format(
            crate=crate,
            version=version,
            runner=runner,
            url=url,
        ))
    resp = requests.head(url, allow_redirects=True)

    if resp.ok:
        logging.debug(
            '{crate} == {version} for {runner} already exists in S3 bucket'.format(
                crate=crate,
                version=version,
                runner=runner,
            ))
        return True

    else:
        logging.warning(
            '{crate} == {version} for {runner} does not exists in S3 bucket'.format(
                crate=crate,
                version=version,
                runner=runner,
            ))
        return False


def build(runner, crate, version):
    root = os.path.join(
        os.getcwd(),
        'build',
        '{}-{}-{}'.format(runner, crate, version)
    )

    logging.info('Preparing build root at {}'.format(root))
    os.makedirs(root, exist_ok=True)

    args = 'cargo install --version {version} --root {root} --no-track {crate}'.format(
        version=version,
        root=root,
        crate=crate,
    )
    subprocess.check_call(args, shell=True)

    return os.path.join(root, 'bin', os.listdir(os.path.join(root, 'bin'))[0])


def upload(client, runner, crate, version, path):
    """Upload prebuilt `crate` with `version` for `runner` environment
    located at `path` to the S3 bucket."""

    ext = '.exe' if runner.lower().startswith('windows') else ''
    object_name = S3_OBJECT_NAME.format(
        crate=crate,
        runner=runner,
        version=version,
        ext=ext,
    )

    logging.info('Uploading {path} to {bucket}/{name}'.format(
        path=path,
        bucket=S3_BUCKET,
        name=object_name,
    ))
    client.upload_file(path, S3_BUCKET, object_name)


class LogFormatter(logging.Formatter):
    def format(self, record):
        msg = record.getMessage()
        if record.levelno == logging.DEBUG:
            return '::debug::{}'.format(msg)
        elif record.levelno == logging.INFO:
            return msg
        elif record.levelno in (logging.WARN, logging.WARNING):
            return '::warning::{}'.format(msg)
        else:
            return '::error::{}'.format(msg)


if __name__ == '__main__':
    logging.config.dictConfig({
        'version': 1,
        'disable_existing_loggers': True,
        'formatters': {
            'gha': {
                '()': LogFormatter,
            },
        },
        'handlers': {
            'stdout': {
                'class': 'logging.StreamHandler',
                'formatter': 'gha',
            },
        },
        'loggers': {
            '': {
                'handlers': ['stdout'],
                'level': 'DEBUG',
            }
        }
    })

    crate = os.environ['CRATE']
    runner = os.environ['RUNNER']

    s3_client = boto3.client(
        's3',
        region_name=S3_REGION,
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )

    logging.info('Building {} crate for {} environment'.format(crate, runner))
    for version in crate_info(crate):
        if not exists(runner, crate, version):
            path = build(runner, crate, version)
            logging.info('Built {} at {}'.format(crate, path))

            upload(s3_client, runner, crate, version, path)
