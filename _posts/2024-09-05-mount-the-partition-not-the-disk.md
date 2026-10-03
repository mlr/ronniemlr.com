---
title: Mount the partition, not the disk
date: 2024-09-05
summary: 'An old EC2 root volume attached to another instance would not mount until I pointed mount at its first partition.'
topics: [AWS]
---

An EC2 instance I no longer used still had files on its root volume that I wanted. You can't download an EBS volume, but you can attach it to an instance that's already running and mount it like any other disk. I detached the old root volume, attached it to a running instance, and tried to mount it:

```
$ sudo mount /dev/xvdb /mnt/old-root
mount: wrong fs type, bad option, bad superblock on /dev/xvdb
```

`sudo file -s /dev/xvdb` said `DOS/MBR boot sector`. That made me think it was the wrong kind of disk. It only means the volume has a partition table, and a root volume almost always does. The filesystem is on the first partition, not on the bare device:

```sh
lsblk -f
sudo mkdir -p /mnt/old-root
sudo mount /dev/xvdb1 /mnt/old-root
```

On Nitro instances the names look like `/dev/nvme1n1` and `/dev/nvme1n1p1`. `lsblk` shows what you actually have.

A few things to watch:

- Don't run `mkfs` on that volume. Generic "attach and mount a volume" guides include it for new, empty volumes. On this one it wipes the data.
- If the old volume is an XFS clone of the current root, mount refuses the duplicate UUID. Add `-o nouuid`.
- Ubuntu images label the root filesystem `cloudimg-rootfs`, and `/etc/fstab` mounts root by that label. With two volumes that have the same label, detach the old one before you reboot.
