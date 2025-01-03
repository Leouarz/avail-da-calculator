"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiPromise, disconnect, initialize, TURING_ENDPOINT, MAINNET_ENDPOINT } from "avail-js-sdk";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { BN } from 'bn.js'
import { formatBalanceToNumber, isNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";


export const revalidate = 0;
const badgeLabels = ["1kb", "100kb", "1mb", "10mb", "1gb"];

export default function Home() {
  const selectValues = ["Mainnet", "Turing"]

  const [isLoading, setIsLoading] = useState(false)
  const [dataToSend, setDataToSend] = useState("")
  const [selectValue, setSelectValue] = useState(selectValues[0])
  const [error, setError] = useState<string | undefined>(undefined)
  const [storageValues, setStorageValues] = useState<{ maxPerTx: number, maxPerBlock: number } | undefined>(undefined)
  const [result, setResult] = useState<{ cost: number, nbTx: number, nbBlocks: number } | undefined>(undefined)
  const [showDetails, setShowDetails] = useState(false)
  const [price, setPrice] = useState<number | undefined>(undefined);

  const getAvailStorageValues = async (api: ApiPromise) => {
    if (storageValues === undefined) {
      const blockLength = (await api.query.system.dynamicBlockLength()).toHuman() as any
      if (!blockLength) throw new Error("Error getting data, please try again later")
      const maxPerTx = Number(api.consts.dataAvailability.maxAppDataLength.toString())
      const maxPerBlock = Number(blockLength.chunkSize) * Number(blockLength.rows) * Number(blockLength.cols) * 0.9 // We take only 90 percent as to not fill the block
      setStorageValues({ maxPerBlock, maxPerTx })
      return { maxPerBlock, maxPerTx }
    } else {
      return storageValues
    }
  }

  const calculateCost = async (maybeDataToSend?: string) => {
    try {
      setIsLoading(true)
      setError(undefined)
      setResult(undefined)
      setShowDetails(false)

      let costInAvail = undefined
      let nbBlocks = 1

      if (dataToSend.length === 0 && maybeDataToSend?.length === 0) throw new Error("You need to paste something to calculate the cost.")

      // Initialize the avail sdk api
      const api = await initialize(selectValue === "Turing" ? TURING_ENDPOINT : MAINNET_ENDPOINT) // Here to change for mainnet

      // Dummy sender
      const sender = "5CDGXH8Q9DzD3TnATTG6qm6f4yR1kbECBGUmh2XbEBQ8Jfa5"

      // Get storage values from the chain
      const { maxPerBlock, maxPerTx } = await getAvailStorageValues(api)

      // Compute the byte size of the given string for computation
      let byteSize = maybeDataToSend?.length || dataToSend.length
      let data = maybeDataToSend?.toLowerCase() || dataToSend.toLowerCase()
      if (data.includes("kb") && !data.includes("mb") && isNumber(data.replace("kb", ''))) {
        byteSize = Math.ceil(Number(data.replace("kb", '')) * 1024)
      }
      if (data.includes("mb") && !data.includes("kb") && isNumber(data.replace("mb", ''))) {
        byteSize = Math.ceil(Number(data.replace("mb", '')) * 1024 * 1024)
      }

      // Compute information about nb of tx
      const nbTransactions = Math.ceil(byteSize / maxPerTx)

      if (nbTransactions === 1) { // Blob is lower or equal to 512kb
        const cost = await api.tx.dataAvailability.submitData("x".repeat(byteSize)).paymentInfo(sender)
        costInAvail = formatBalanceToNumber(cost.partialFee.toString())
      } else {
        // Compute information about the minimum nb of blocks needed
        nbBlocks = Math.ceil(byteSize / maxPerBlock)

        // Create the transactions (We only need to create the first and last as all middle ones will be same as last)
        const dataFirstTx = "x".repeat(maxPerTx)
        let dataLastTx = "x".repeat(byteSize % maxPerTx)
        if (dataLastTx.length === 0) dataLastTx = dataFirstTx
        const txFirst = api.tx.dataAvailability.submitData(dataFirstTx)
        const txLast = api.tx.dataAvailability.submitData(dataLastTx)
        const costFirstTx = await txFirst.paymentInfo(sender)
        const costLastTx = await txLast.paymentInfo(sender)

        costInAvail = formatBalanceToNumber(costFirstTx.partialFee.mul(new BN(nbTransactions - 1)).add(costLastTx.partialFee).toString())
      }
      setResult({ cost: costInAvail, nbTx: nbTransactions, nbBlocks })
      await disconnect()
    } catch (err: any) {
      console.log(err)
      if (err.message) {
        setError(err.message)
      } else {
        setError(JSON.stringify(err))
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchPrice = async () => {
      const res = await fetch('/api/price')
      const data = await res.json()
      setPrice(data.price)
    };

    fetchPrice()
  }, []);

  const AvailCardHeader = () => {
    return (
      <CardHeader>
        <CardTitle className="text-6xl">Avail DA Calculator</CardTitle>
        <CardDescription className="text-xl">
          Calculate the cost to send transaction to Avail
        </CardDescription>
        <CardDescription className="text-sm">
          {`Paste the data you want to submit to Avail and press "Calculate"`}
        </CardDescription>
      </CardHeader>
    );
  };

  return (
    <main className="flex flex-col min-h-[90vh] max-w-3xl justify-center text-center mx-auto">
      <div>
        <Card className="min-w-full rounded-none md:rounded-2xl h-fit p-1 sm:p-2 md:p-16">
          <AvailCardHeader />
          <CardContent className=" text-left">
            <div className="grid w-full items-center gap-8">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="chain" className="text-lg">
                  Chain
                </Label>
                <Select
                  disabled={isLoading}
                  value={selectValue}
                  onValueChange={(network) =>
                    setSelectValue(
                      selectValues.find((y) => y === network) ||
                      selectValues[0]
                    )
                  }
                >
                  <SelectTrigger id="network">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {selectValues.map((x) => {
                      return (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="dataToSend" className="text-lg">
                  Data you want to submit
                </Label>
                <Textarea
                  id="dataToSend"
                  placeholder="0x... or 128kb"
                  disabled={isLoading}
                  value={dataToSend}
                  onChange={(e) => setDataToSend(e.target.value)}
                  autoFocus
                  maxLength={520000}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col">
            <CardDescription className="text-sm">
              {`If you prefer to directly use the size of you blob(s), you can put the size in kb or mb with this format "512kb" or "2mb"`}
            </CardDescription>
            <div className="flex flex-wrap justify-center gap-4 my-4">
              {badgeLabels.map((label, index) => (
                <Badge
                  key={index}
                  onClick={() => {
                    let data = label.includes("1gb") ? "1000mb" : label
                    setDataToSend(data)
                    calculateCost(data)
                  }}
                  className="cursor-pointer border border-blue-500 bg-transparent text-blue-500 px-4 py-2 rounded-lg shadow-sm hover:bg-blue-100 transition-all duration-200 ease-in-out"
                >
                  {label}
                </Badge>
              ))}
            </div>
            <Button
              className="w-full rounded-full"
              onClick={() => calculateCost()}
              disabled={isLoading}
            >
              Calculate
            </Button>

            {result &&
              <>
                <div className="border rounded border-blue-500 p-4 mt-2 w-full">
                  <div className="text-blue-500 text-lg">
                    {`Sending this data will cost ${result.cost} AVAIL ${price ? `(≃${(price * result.cost).toFixed(3)}$)` : ''}`}
                  </div>
                  <div className="underline cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
                    {!showDetails ? `Details` : `Hide details`}
                  </div>
                  {showDetails &&
                    <>
                      <div>
                        {`Your data will be split in ${result.nbTx} blob${result.nbTx > 1 ? "s" : ""} / transaction${result.nbTx > 1 ? "s" : ""}`}
                      </div>
                      <div>
                        {`The blobs will be sent in ${result.nbBlocks} block${result.nbBlocks > 1 ? "s" : ""}`}
                      </div>
                    </>
                  }
                </div>
              </>
            }


            {error && <div className="text-red-500 mt-2">{error}</div>}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
