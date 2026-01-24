import React from "react";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftCircle,
  Brush,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsLeftRight,
  ChevronUp,
  Clapperboard,
  Coins,
  Copy,
  Dices,
  Download,
  Edit,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  Focus,
  Folders,
  Hand,
  History,
  Image,
  ImagePlus,
  Import,
  Info,
  Keyboard,
  Layers,
  Locate,
  LocateFixed,
  Lock,
  LucideProps,
  Minus,
  MoreHorizontal,
  MoreVertical,
  Palette,
  Pencil,
  Plus,
  Redo,
  RefreshCw as RefreshClockwise,
  Search,
  MousePointer2 as Select,
  Settings,
  Sidebar,
  SidebarClose,
  SidebarOpen,
  Slash,
  Sliders,
  Sprout,
  Star,
  TimerReset,
  Trash,
  Undo,
  Unlock,
  Upload,
  Users,
  Wand2 as Wand,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  ArtStation,
  AspectRatio,
  CGSociety,
  Discord,
  Dream,
  Generate,
  InfoIcon,
  Instagram,
  ModelIcon,
  Rectangle,
  Scale,
  ShareIcon,
  SlidersIcon,
  Steps,
  Twitter,
  Upscale,
  Variation,
} from "./SVGs";

export declare namespace Icon {
  export {
    AlertCircle,
    AlertTriangle,
    Brush,
    Camera,
    Image,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clapperboard,
    Users,
    ChevronsDownUp,
    Copy,
    Dices,
    Download,
    Eye,
    Edit,
    EyeOff,
    ExternalLink,
    Hand,
    History,
    Import,
    Info,
    Layers,
    Locate,
    Undo,
    Redo,
    LocateFixed,
    Minus,
    MoreVertical,
    MoreHorizontal,
    Slash,
    Plus,
    Select,
    Sidebar,
    SidebarOpen,
    SidebarClose,
    Search,
    Settings,
    Sliders,
    Trash,
    Wand,
    Upload,
    Wrench,
    X,
    RefreshClockwise,
    ArtStation,
    Instagram,
    Twitter,
    Discord,
    CGSociety,
    InfoIcon,
    ShareIcon,
    AspectRatio,
    ModelIcon,
    SlidersIcon,
    Sprout,
    Star,
    TimerReset,
    ZoomIn,
    ZoomOut,
    Focus,
    Palette,
    Steps,
    Generate,
    Scale,
    Folders,
    Coins,
    Eraser,
    Lock,
    Unlock,
    Rectangle,
    ArrowLeftCircle,
    ImagePlus,
    Variation,
    Pencil,
    Dream,
    Upscale,
    Keyboard,
    ChevronsLeftRight,
  };
}

export namespace Icon {
  export type Prop = React.ReactNode | React.FunctionComponent<Props>;
  export type Props = LucideProps;

  type LucideIconType = React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;

  type CustomIconType = (props: Props) => JSX.Element;

  function wrapLucideIcon(LucideIcon: LucideIconType): LucideIconType {
    const WrappedIcon = (props: Props) => (
      <LucideIcon {...props} strokeWidth={1.5} />
    );
    Object.assign(WrappedIcon, LucideIcon);
    return WrappedIcon as unknown as LucideIconType;
  }

  function wrapCustomIcon(CustomIcon: CustomIconType): CustomIconType {
    return (props: Props) => <CustomIcon {...props} strokeWidth={1.5} />;
  }

  Icon.AlertCircle = wrapLucideIcon(AlertCircle);
  Icon.AlertTriangle = wrapLucideIcon(AlertTriangle);
  Icon.Brush = wrapLucideIcon(Brush);
  Icon.Camera = wrapLucideIcon(Camera);
  Icon.Check = wrapLucideIcon(Check);
  Icon.ChevronDown = wrapLucideIcon(ChevronDown);
  Icon.ChevronUp = wrapLucideIcon(ChevronUp);
  Icon.ChevronsDownUp = wrapLucideIcon(ChevronsDownUp);
  Icon.ChevronLeft = wrapLucideIcon(ChevronLeft);
  Icon.Users = wrapLucideIcon(Users);
  Icon.Clapperboard = wrapLucideIcon(Clapperboard);
  Icon.ChevronRight = wrapLucideIcon(ChevronRight);
  Icon.Copy = wrapLucideIcon(Copy);
  Icon.Dices = wrapLucideIcon(Dices);
  Icon.Download = wrapLucideIcon(Download);
  Icon.Image = wrapLucideIcon(Image);
  Icon.Eye = wrapLucideIcon(Eye);
  Icon.Folders = wrapLucideIcon(Folders);
  Icon.EyeOff = wrapLucideIcon(EyeOff);
  Icon.Edit = wrapLucideIcon(Edit);
  Icon.ExternalLink = wrapLucideIcon(ExternalLink);
  Icon.Slash = wrapLucideIcon(Slash);
  Icon.Hand = wrapLucideIcon(Hand);
  Icon.History = wrapLucideIcon(History);
  Icon.Import = wrapLucideIcon(Import);
  Icon.Info = wrapLucideIcon(Info);
  Icon.Layers = wrapLucideIcon(Layers);
  Icon.Palette = wrapLucideIcon(Palette);
  Icon.Locate = wrapLucideIcon(Locate);
  Icon.LocateFixed = wrapLucideIcon(LocateFixed);
  Icon.Minus = wrapLucideIcon(Minus);
  Icon.MoreVertical = wrapLucideIcon(MoreVertical);
  Icon.MoreHorizontal = wrapLucideIcon(MoreHorizontal);
  Icon.Plus = wrapLucideIcon(Plus);
  Icon.Select = wrapLucideIcon(Select);
  Icon.Settings = wrapLucideIcon(Settings);
  Icon.Sliders = wrapLucideIcon(Sliders);
  Icon.Trash = wrapLucideIcon(Trash);
  Icon.Wand = wrapLucideIcon(Wand);
  Icon.Undo = wrapLucideIcon(Undo);
  Icon.Redo = wrapLucideIcon(Redo);
  Icon.Upload = wrapLucideIcon(Upload);
  Icon.Wrench = wrapLucideIcon(Wrench);
  Icon.X = wrapLucideIcon(X);
  Icon.Search = wrapLucideIcon(Search);
  Icon.RefreshClockwise = wrapLucideIcon(RefreshClockwise);
  Icon.Sprout = wrapLucideIcon(Sprout);
  Icon.Star = wrapLucideIcon(Star);
  Icon.TimerReset = wrapLucideIcon(TimerReset);
  Icon.ZoomIn = wrapLucideIcon(ZoomIn);
  Icon.ZoomOut = wrapLucideIcon(ZoomOut);
  Icon.Focus = wrapLucideIcon(Focus);
  Icon.Sidebar = wrapLucideIcon(Sidebar);
  Icon.SidebarOpen = wrapLucideIcon(SidebarOpen);
  Icon.SidebarClose = wrapLucideIcon(SidebarClose);
  Icon.Coins = wrapLucideIcon(Coins);
  Icon.Eraser = wrapLucideIcon(Eraser);
  Icon.Lock = wrapLucideIcon(Lock);
  Icon.Unlock = wrapLucideIcon(Unlock);
  Icon.ArrowLeftCircle = wrapLucideIcon(ArrowLeftCircle);
  Icon.ImagePlus = wrapLucideIcon(ImagePlus);
  Icon.Pencil = wrapLucideIcon(Pencil);
  Icon.Keyboard = wrapLucideIcon(Keyboard);
  Icon.ChevronsLeftRight = wrapLucideIcon(ChevronsLeftRight);

  Icon.ArtStation = wrapCustomIcon(ArtStation);
  Icon.Instagram = wrapCustomIcon(Instagram);
  Icon.Twitter = wrapCustomIcon(Twitter);
  Icon.Discord = wrapCustomIcon(Discord);
  Icon.Generate = wrapCustomIcon(Generate);
  Icon.CGSociety = wrapCustomIcon(CGSociety);
  Icon.InfoIcon = wrapCustomIcon(InfoIcon);
  Icon.ShareIcon = wrapCustomIcon(ShareIcon);
  Icon.AspectRatio = wrapCustomIcon(AspectRatio);
  Icon.ModelIcon = wrapCustomIcon(ModelIcon);
  Icon.SlidersIcon = wrapCustomIcon(SlidersIcon);
  Icon.Steps = wrapCustomIcon(Steps);
  Icon.Scale = wrapCustomIcon(Scale);
  Icon.Rectangle = wrapCustomIcon(Rectangle);
  Icon.Variation = wrapCustomIcon(Variation);
  Icon.Dream = wrapCustomIcon(Dream);
  Icon.Upscale = wrapCustomIcon(Upscale);

  export function Invisible(props: Props) {
    return (
      <Icon.Check
        {...props}
        css={css`
          & {
            opacity: 0;
          }
        `}
      />
    );
  }
}
