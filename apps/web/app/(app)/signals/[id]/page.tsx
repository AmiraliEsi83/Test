import { SignalDetail } from "@/components/Screens";
export default function Page({ params }: { params: { id: string } }) { return <SignalDetail id={params.id} />; }
