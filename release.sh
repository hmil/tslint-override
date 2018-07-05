
git_status=`git status --porcelain`

if [ ! -z "$git_status" ]; then
    echo "Your repo is not clean! Aborting"
    exit 1
fi

echo "Version?"
read version

echo "Message?"
read message

echo "About to release ${version}: ${$message}. Proceed? [y/N]"

read proceed

if [ "$proceed" -ne "y" ]; then
    echo "aborting"
fi

git tag -s -m "${message}" "${version}"
git push --tags
