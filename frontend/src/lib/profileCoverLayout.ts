type ProfileCoverLayout = {
  frameClassName: string;
  avatarOverlapClassName: string;
  imageClassName: string;
};


export function getPublicProfileCoverLayout(): ProfileCoverLayout {
  return {
    frameClassName: "w-full overflow-hidden",
    avatarOverlapClassName: "-mt-[60px] max-sm:-mt-[48px]",
    imageClassName: "h-full w-full object-cover",
  };
}


export function getManageProfileCoverLayout(): ProfileCoverLayout {
  return {
    frameClassName: "w-full overflow-hidden rounded-[18px]",
    avatarOverlapClassName: "-mt-[52px]",
    imageClassName: "h-full w-full object-cover",
  };
}
