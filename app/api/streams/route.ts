import { prismaClient } from "@/app/lib/db";
//@ts-expect-error = This error is expected due to a known issue with the library type definitions
import youtubeThumbnail from 'youtube-thumbnail'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
//@ts-expect-error = This error is expected due to a known issue with the library type definitions
import youtubesearchapi from "youtube-search-api";
//import { YT_REGEX } from "@/app/lib/utils";
import { getServerSession } from "next-auth";

const CreateStreamSchema = z.object({
    creatorId: z.string(),
    url: z.string()
});

const MAX_QUEUE_LEN = 20;

/*export async function POST(req: NextRequest) {

    try {
        const data = CreateStreamSchema.parse(await req.json());
        console.log(data)
        const isYt = data.url.match(YT_REGEX)
        if (!isYt) {
            return NextResponse.json({
                message: "Wrong URL format"
            }, {
                status: 411
            })
            console.log(req.method);
        }

        const extractedId = data.url.split("?v=")[1];

        const res = await youtubesearchapi.GetVideoDetails(extractedId);

        const thumbnails = res.thumbnail.thumbnails;
        thumbnails.sort((a: { width: number }, b: { width: number }) => a.width < b.width ? -1 : 1);

        const existingActiveStream = await prismaClient.stream.count({
            where: {
                userId: data.creatorId
            }
        })

        if (existingActiveStream > MAX_QUEUE_LEN) {
            return NextResponse.json({
                message: "Already at limit"
            }, {
                status: 411
            })
        }

        const stream = await prismaClient.stream.create({
            data: {
                userId: data.creatorId,
                url: data.url,
                extractedId,
                type: "Youtube",
                title: res.title ?? "Cant find video",
                smallImg: (thumbnails.length > 1 ? thumbnails[thumbnails.length - 2].url : thumbnails[thumbnails.length - 1].url) ?? "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                bigImg: thumbnails[thumbnails.length - 1].url ?? "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg"
            }
        });

        console.log(stream)

        return NextResponse.json({
            ...stream,
            hasUpvoted: false,
            upvotes: 0
        })
    } catch (e) {
        console.log(e);
        return NextResponse.json({
            message: "Error while adding a stream"
        }, {
            status: 411
        })
    }


}*/

export async function POST(req: NextRequest) {
    try {
        const data = CreateStreamSchema.parse(await req.json());
        console.log('Request data:', data);

        const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = data.url.match(urlPattern);
        if (!match || match.length < 2) {
            return NextResponse.json({ message: "Invalid YouTube URL format" }, { status: 400 });
        }

        const extractedId = match[1];
        let res;

        const YTT = youtubeThumbnail(data.url)
        console.log(YTT)

        /*try {
            res = await youtubesearchapi.GetVideoDetails(extractedId);
            console.log('YouTube API Response:', JSON.stringify(res, null, 2));
        } catch (error) {
            console.error('Error fetching video details:', error);
            return NextResponse.json({ message: "Error fetching video details" }, { status: 500 });
        }*/

        try {
            res = await youtubesearchapi.GetVideoDetails(extractedId);
            if (!res || !res.thumbnail?.thumbnails || !res.title) {
                console.error('Incomplete YouTube API response', res);
                return NextResponse.json({ message: "Incomplete video details" }, { status: 500 });
            }
            console.log('YouTube API Response:', JSON.stringify(res, null, 2));
        } catch (error) {
            console.error('Error fetching video details:', error);
            return NextResponse.json({ message: "Error fetching video details" }, { status: 500 });
        }

        
        // Safeguard against missing thumbnails or undefined response
        const thumbnails = res?.thumbnail?.thumbnails || [];
       // console.log(thumbnails)
       // console.log(thumbnails.length)
        if (thumbnails.length === 0) {
            console.error('No thumbnails found for video ID:', extractedId);
            //  return NextResponse.json({ message: "No thumbnails found for the video" }, { status: 404 });
        }

        const existingActiveStream = await prismaClient.stream.count({
            where: {
                userId: data.creatorId
            }
        });

        if (existingActiveStream > MAX_QUEUE_LEN) {
            return NextResponse.json({
                message: "Already at limit"
            }, {
                status: 411
            });
        }

        const stream = await prismaClient.stream.create({
            data: {
                userId: data.creatorId,
                url: data.url,
                extractedId,
                type: "Youtube",
                title: res.title || "Can't find video",
                smallImg: (thumbnails.length > 1 ? thumbnails[thumbnails.length - 2].url : thumbnails[thumbnails.length - 1].url) || "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                bigImg: thumbnails[thumbnails.length - 1].url || "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg"
            }
        });

        console.log('Stream created:', stream);

        return NextResponse.json({
            ...stream,
            hasUpvoted: false,
            upvotes: 0
        });
    } catch (e) {
        console.error('Error in POST handler:', e);
        return NextResponse.json({
            message: "Error while adding a stream"
        }, {
            status: 500
        });
    }
}



export async function GET(req: NextRequest) {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    const session = await getServerSession();

    // TODO: You can get rid of the db call here 
    const user = await prismaClient.user.findFirst({
        where: {
            email: session?.user?.email ?? ""
        }
    });

    if (!user) {
        return NextResponse.json({
            message: "Unauthenticated"
        }, {
            status: 403
        })
    }

    if (!creatorId) {
        console.log(creatorId)
        return NextResponse.json({
            message: "Error"
        }, {
            status: 411
        })
    }

    const [streams, activeStream] = await Promise.all([await prismaClient.stream.findMany({
        where: {
            userId: creatorId,
            played: false
        },
        include: {
            _count: {
                select: {
                    upvotes: true
                }
            },
            upvotes: {
                where: {
                    userId: user.id
                }
            }
        }
    }), prismaClient.currentStream.findFirst({
        where: {
            userId: creatorId
        },
        include: {
            stream: true
        }
    })])

    return NextResponse.json({
        streams: streams.map(({ _count, ...rest }) => ({
            ...rest,
            upvotes: _count.upvotes,
            haveUpvoted: rest.upvotes.length ? true : false
        })),
        activeStream

    })

}
